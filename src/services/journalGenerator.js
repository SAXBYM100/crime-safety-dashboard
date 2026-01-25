import { computeSafetyScore } from "../analytics/safetyScore";
import { getAreaProfile } from "../data";
import { createJournalArticle } from "./journalStore";
import { fetchGuardianContext } from "./guardian";

const POST_TYPES = [
  "Crime Trend Brief",
  "Local Risk Snapshot",
  "Area Intelligence Update",
  "Safety Signal Alert",
  "Neighbourhood Watch Brief",
  "Urban Risk Pulse",
  "Public Safety Intelligence Note",
];

const NARRATIVE_ANGLES = [
  "data-first",
  "community-first",
  "property-first",
  "infrastructure-first",
  "policing-first",
];

const STRUCTURE_VARIANTS = [
  "Executive Brief",
  "Intelligence Bulletin",
  "Analyst Note",
  "Situation Update",
];

const IMAGE_THEMES = ["street", "aerial", "night", "residential"];
const TREND_VALUES = new Set(["up", "down", "flat", "volatile"]);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function toMonthLabel(value) {
  return value || "Latest";
}

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function createSeededRng(seedValue) {
  let seed = 1779033703 ^ seedValue.length;
  for (let i = 0; i < seedValue.length; i += 1) {
    seed = Math.imul(seed ^ seedValue.charCodeAt(i), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }
  return () => {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967296;
  };
}

function pickOne(rng, list = []) {
  if (!list.length) return null;
  const idx = Math.floor(rng() * list.length);
  return list[Math.max(0, Math.min(idx, list.length - 1))];
}

function shuffleWithRng(rng, list = []) {
  const output = [...list];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

function pickN(rng, list = [], count = 1) {
  if (!list.length || count <= 0) return [];
  return shuffleWithRng(rng, list).slice(0, Math.min(count, list.length));
}

function pickNOrdered(rng, list = [], count = 1) {
  const picked = new Set(pickN(rng, list, count));
  return list.filter((item) => picked.has(item));
}

function pctChange(current, previous) {
  if (!Number.isFinite(previous) || previous <= 0 || !Number.isFinite(current)) return null;
  return ((current - previous) / previous) * 100;
}

function detectVolatility(trendRows = []) {
  if (trendRows.length < 4) return false;
  const recent = trendRows.slice(-4).map((row) => row.total || 0);
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  if (min <= 0) return false;
  return (max - min) / min > 0.35;
}

function buildSignals({ currentTotal, prevTotal, topCategory, topShare, trendRows, safetyScore, monthLabel }) {
  const deltaPct = pctChange(currentTotal, prevTotal);
  const isVolatile = detectVolatility(trendRows);
  const signals = [];
  if (Number.isFinite(safetyScore)) {
    signals.push({
      label: "Composite safety index",
      value: `${Math.round(safetyScore)}`,
      trend: "flat",
      source: "Area IQ model",
    });
  }
  if (currentTotal != null) {
    signals.push({
      label: `Reported incidents (${monthLabel})`,
      value: `${currentTotal}`,
      trend: prevTotal != null && currentTotal > prevTotal ? "up" : prevTotal != null && currentTotal < prevTotal ? "down" : "flat",
      source: "UK Police API",
    });
  }
  if (deltaPct != null) {
    signals.push({
      label: "Change vs previous month",
      value: `${deltaPct.toFixed(1)}%`,
      trend: deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat",
      source: "UK Police API",
    });
  }
  if (topCategory && topShare != null) {
    signals.push({
      label: "Top category share",
      value: `${topShare.toFixed(1)}%`,
      trend: "flat",
      source: "UK Police API",
    });
  }
  if (trendRows.length > 0) {
    signals.push({
      label: "Trend coverage (months)",
      value: `${trendRows.length}`,
      trend: "flat",
      source: "UK Police API",
    });
  }
  if (trendRows.length >= 3) {
    const last3 = trendRows.slice(-3).map((row) => row.total || 0);
    const avg = sum(last3) / last3.length;
    signals.push({
      label: "3-month average incidents",
      value: `${Math.round(avg)}`,
      trend: "flat",
      source: "UK Police API",
    });
  }
  if (isVolatile) {
    signals.push({
      label: "Recent volatility",
      value: "Elevated",
      trend: "volatile",
      source: "Area IQ analysis",
    });
  }

  const fallbackSignals = [
    {
      label: "Reporting coverage",
      value: trendRows.length ? "Monthly series" : "Single month",
      trend: "flat",
      source: "UK Police API",
    },
    {
      label: "Category coverage",
      value: topCategory ? "Detailed" : "Partial",
      trend: "flat",
      source: "UK Police API",
    },
    {
      label: "Latest data month",
      value: monthLabel,
      trend: "flat",
      source: "UK Police API",
    },
    {
      label: "Data completeness",
      value: trendRows.length >= 3 ? "Stable series" : "Limited series",
      trend: "flat",
      source: "Area IQ analysis",
    },
  ];

  for (const fallback of fallbackSignals) {
    if (signals.length >= 4) break;
    signals.push(fallback);
  }

  return signals.slice(0, 8);
}

function buildInsights({ rng, deltaPct, topCategory, topShare, trendRows, currentTotal, locationName }) {
  const insights = [];
  const trendSentence = deltaPct != null
    ? pickOne(rng, [
        `Monthly incidents moved ${deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat"} by ${Math.abs(deltaPct).toFixed(1)}%.`,
        `Month-on-month volume is ${deltaPct > 0 ? "higher" : deltaPct < 0 ? "lower" : "flat"} by ${Math.abs(deltaPct).toFixed(1)}%.`,
      ])
    : "Month-on-month change is unavailable due to missing prior data.";
  insights.push(trendSentence);

  const categorySentence = topCategory && topShare != null
    ? pickOne(rng, [
        `${topCategory} made up ${topShare.toFixed(1)}% of recorded incidents.`,
        `${topCategory} remains the largest category at ${topShare.toFixed(1)}% of incidents.`,
      ])
    : "Category mix could not be verified for this month.";
  insights.push(categorySentence);

  if (trendRows.length >= 3) {
    insights.push("Three-month averages reduce noise and are the most stable short-term signal.");
  } else {
    insights.push("A longer series is needed to confirm sustained direction.");
  }

  if (currentTotal != null) {
    insights.push(
      pickOne(rng, [
        `${locationName} sits at ${currentTotal} incidents for the latest month, which is useful for patrol or resource planning.`,
        `Latest totals place ${locationName} at ${currentTotal} incidents, a practical benchmark for local risk posture.`,
      ])
    );
  }

  insights.push(
    pickOne(rng, [
      "Short-term spikes should be treated as signals, not definitive shifts, until a second month confirms direction.",
      "Treat single-month movement as a signal; confirmation requires at least one additional month.",
    ])
  );

  insights.push(
    pickOne(rng, [
      "Focus mitigations on the dominant category to reduce the largest share of incidents.",
      "Mitigation should prioritize the leading category because it drives the largest share of risk.",
    ])
  );

  while (insights.length < 5) {
    insights.push("Use the latest month as a baseline and review again after the next reporting cycle.");
  }

  return insights.slice(0, 10);
}

function buildDefinitions({ rng }) {
  const definitions = [
    "Incident = a recorded crime event from UK Police data.",
    "Category share = percentage of incidents attributed to the leading category.",
    "Monthly change = percentage difference vs the prior month.",
    "Composite safety index = Area IQ score derived from volume and category mix.",
    "Trend coverage = count of months available in the time series.",
    "Three-month average = mean of the latest three months to smooth volatility.",
    "Volatility = high month-to-month swings relative to recent totals.",
    "Reported incidents = all crimes logged for the selected boundary in the period.",
  ];
  return pickN(rng, definitions, 6);
}

function buildMethodology({ monthLabel }) {
  return (
    `Compiled from UK Police recorded crime data for ${monthLabel} and adjacent months where available. ` +
    "Incident categories are aggregated to summarize short-term risk signals and category mix.\n\n" +
    "Limitations include reporting delays, under-reporting, boundary mismatches, and category reclassification that can affect totals."
  );
}

function buildSeoDescription({ locationName, monthLabel, postType, currentTotal, deltaPct, rng }) {
  const includePhrase = rng() < 0.6;
  const phrase = rng() < 0.5 ? `Is ${locationName} safe` : `${locationName} crime trends`;
  const totalClause = currentTotal != null ? `${currentTotal} reported incidents` : "reported incidents";
  const changeClause = deltaPct != null
    ? `${Math.abs(deltaPct).toFixed(1)}% ${deltaPct >= 0 ? "increase" : "decrease"}`
    : "month-on-month movement";
  let text = includePhrase
    ? `${phrase}? ${postType} for ${monthLabel} with ${totalClause} and ${changeClause}, plus key signals and methodology.`
    : `${postType} for ${locationName} in ${monthLabel} with ${totalClause}, ${changeClause}, and analyst signals.`;

  if (text.length > 160) {
    text = `${text.slice(0, 157)}...`;
  } else if (text.length < 150) {
    text = `${text} Data reflects reported incidents.`;
  }
  return text;
}

function buildHeadline({ rng, locationName, monthLabel, postType, structureVariant }) {
  const templates = [
    `${postType}: ${locationName} risk signal for ${monthLabel}`,
    `${locationName} ${monthLabel} ${structureVariant}`,
    `${locationName} ${postType} - ${monthLabel}`,
    `${locationName} public safety brief for ${monthLabel}`,
  ];
  return pickOne(rng, templates);
}

function buildTeaser({ rng, locationName, monthLabel, narrativeAngle }) {
  const angleLead = {
    "data-first": "Data-led snapshot",
    "community-first": "Community exposure snapshot",
    "property-first": "Property risk signal",
    "infrastructure-first": "Infrastructure exposure readout",
    "policing-first": "Operational signal brief",
  };
  const lead = angleLead[narrativeAngle] || "Safety snapshot";
  const templates = [
    `${lead} for ${locationName} in ${monthLabel}, highlighting category mix and month-on-month movement.`,
    `${lead} covering ${locationName} for ${monthLabel}, with key indicators and trend context.`,
    `${lead} for ${locationName}, using the latest ${monthLabel} data to surface priority signals.`,
  ];
  return pickOne(rng, templates);
}

function buildAnswerSummary({
  rng,
  locationName,
  monthLabel,
  currentTotal,
  deltaPct,
  topCategory,
  topShare,
  safetyScore,
  trendRows,
}) {
  const sentences = [];

  if (currentTotal != null) {
    sentences.push(
      pickOne(rng, [
        `${locationName} logged ${currentTotal} reported incidents in ${monthLabel}.`,
        `Reported incidents in ${locationName} totalled ${currentTotal} for ${monthLabel}.`,
        `${monthLabel} shows ${currentTotal} reported incidents across ${locationName}.`,
      ])
    );
  }

  if (deltaPct != null) {
    sentences.push(
      pickOne(rng, [
        `That is ${Math.abs(deltaPct).toFixed(1)}% ${deltaPct >= 0 ? "higher" : "lower"} than the prior month.`,
        `Month-on-month volume is ${Math.abs(deltaPct).toFixed(1)}% ${deltaPct >= 0 ? "up" : "down"}.`,
      ])
    );
  } else {
    sentences.push("Month-on-month movement cannot be confirmed due to limited prior data.");
  }

  if (topCategory && topShare != null) {
    sentences.push(
      pickOne(rng, [
        `${topCategory} is the leading category at ${topShare.toFixed(1)}% of incidents.`,
        `${topCategory} accounts for ${topShare.toFixed(1)}% of reported incidents.`,
      ])
    );
  }

  if (Number.isFinite(safetyScore)) {
    sentences.push(`The composite safety index sits at ${Math.round(safetyScore)} for this period.`);
  }

  if (trendRows.length >= 3) {
    const last3 = trendRows.slice(-3).map((row) => row.total || 0);
    const avg = sum(last3) / last3.length;
    sentences.push(`The three-month average is ${Math.round(avg)} incidents, smoothing short-term spikes.`);
  } else {
    sentences.push("Trend depth is limited, so direction should be treated as provisional.");
  }

  if (sentences.length < 3) {
    sentences.push("Signals are derived from reported incidents within the defined boundary.");
  }

  const targetCount = Math.max(3, Math.min(6, 3 + Math.floor(rng() * 4)));
  return pickNOrdered(rng, sentences, targetCount).join(" ");
}

function normalizeManifestItems(manifest) {
  if (!manifest) return [];
  if (Array.isArray(manifest)) return manifest;
  if (Array.isArray(manifest.items)) return manifest.items;
  return [];
}

function matchPrefix(items, prefix) {
  return items.filter((item) => String(item?.filePath || "").startsWith(prefix));
}

function themeAltLead(theme) {
  const leads = {
    street: "Street scene",
    aerial: "Aerial view",
    night: "Nighttime street",
    residential: "Residential area",
    "generic-uk": "UK street scene",
  };
  return leads[theme] || "Street scene";
}

function buildAltText({ locationName, locationRef, theme }) {
  const place = locationName || (locationRef ? locationRef.replace(/-/g, " ") : "UK");
  const lead = themeAltLead(theme);
  return `${lead} in ${place}`.trim();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveImageTheme({ imageTheme, narrativeAngle }) {
  if (imageTheme && imageTheme !== "auto" && IMAGE_THEMES.includes(imageTheme)) {
    return imageTheme;
  }
  const angleMap = {
    "data-first": "aerial",
    "community-first": "street",
    "property-first": "residential",
    "infrastructure-first": "aerial",
    "policing-first": "night",
  };
  return angleMap[narrativeAngle] || "street";
}

function selectImagesFromManifest({ rng, locationRef, locationName, manifest, imageTheme, narrativeAngle }) {
  const items = normalizeManifestItems(manifest)
    .filter((item) => isNonEmptyString(item?.filePath))
    .filter((item) => item.filePath.startsWith("/image-bank/"));
  if (!items.length) return {};

  const normalizedRef = String(locationRef || "").toLowerCase();
  const locationPrefix = normalizedRef ? `/image-bank/cities/${normalizedRef}/` : "";
  const cityItems = locationPrefix ? matchPrefix(items, locationPrefix) : [];

  let pool = cityItems;
  let theme = "street";

  if (!pool.length && normalizedRef.includes("-")) {
    const alias = normalizedRef.split("-")[0];
    if (alias && alias !== normalizedRef) {
      const aliasPrefix = `/image-bank/cities/${alias}/`;
      pool = matchPrefix(items, aliasPrefix);
    }
  }

  if (!pool.length && imageTheme === "generic-uk") {
    theme = "generic-uk";
    pool = matchPrefix(items, "/image-bank/generic-uk/");
  }

  if (!pool.length) {
    theme = resolveImageTheme({ imageTheme, narrativeAngle });
    pool = matchPrefix(items, `/image-bank/themes/${theme}/`);
  }

  if (!pool.length) {
    theme = "street";
    pool = matchPrefix(items, "/image-bank/generic-uk/");
  }

  if (!pool.length) return {};

  const heroEntry = pickOne(rng, pool);
  const heroUrl = isNonEmptyString(heroEntry?.filePath) ? heroEntry.filePath.trim() : "";
  const heroImage = heroUrl
    ? {
        url: heroUrl,
        alt: String(buildAltText({ locationName, locationRef, theme }) || ""),
        credit: String(heroEntry?.creditLine || ""),
      }
    : null;

  const galleryCandidates = pool.filter(
    (entry) => isNonEmptyString(entry?.filePath) && entry.filePath.trim() !== heroUrl
  );
  const galleryCount = Math.min(3, Math.max(1, Math.floor(rng() * 3)));
  const gallery = pickN(rng, galleryCandidates, galleryCount)
    .map((entry) => ({
      url: entry.filePath.trim(),
      alt: String(buildAltText({ locationName, locationRef, theme }) || ""),
    }))
    .filter((entry) => isNonEmptyString(entry.url));

  const output = {};
  if (heroImage) output.heroImage = heroImage;
  if (gallery.length) output.gallery = gallery;
  return output;
}

function normalizeStrings(values) {
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0);
}

function enforceCount(values, min, max, fallback = []) {
  const trimmed = values.slice(0, max);
  if (trimmed.length >= min) return trimmed;
  const needed = min - trimmed.length;
  return trimmed.concat(fallback.slice(0, needed));
}

function normalizeSignals(values, fallbackSignals = []) {
  const normalized = values
    .map((signal) => {
      if (!signal) return null;
      const label = String(signal.label || "").trim();
      const value = String(signal.value || "").trim();
      const source = String(signal.source || "").trim();
      const trend = TREND_VALUES.has(signal.trend) ? signal.trend : "flat";
      if (!label || !value || !source) return null;
      return { label, value, trend, source };
    })
    .filter(Boolean);

  const trimmed = normalized.slice(0, 8);
  if (trimmed.length >= 4) return trimmed;

  const needed = 4 - trimmed.length;
  const fallback = fallbackSignals.slice(0, needed).map((signal) => ({
    label: signal.label,
    value: signal.value,
    trend: TREND_VALUES.has(signal.trend) ? signal.trend : "flat",
    source: signal.source,
  }));
  return trimmed.concat(fallback).slice(0, 8);
}

function validateRequiredFields(payload) {
  const required = [
    "slug",
    "headline",
    "teaser",
    "publishDate",
    "answerSummary",
    "signals",
    "definitions",
    "insights",
    "methodology",
    "sources",
    "generatedAt",
  ];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null);
  if (missing.length) {
    throw new Error(`Journal article validation failed: missing ${missing.join(", ")}`);
  }
}

function applyValidationGate(payload, fallbacks) {
  validateRequiredFields(payload);

  const normalized = {
    ...payload,
    signals: Array.isArray(payload.signals) ? payload.signals : [],
    definitions: Array.isArray(payload.definitions) ? payload.definitions : [],
    insights: Array.isArray(payload.insights) ? payload.insights : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
  };

  normalized.signals = normalizeSignals(normalized.signals, fallbacks.signals);
  normalized.definitions = enforceCount(
    normalizeStrings(normalized.definitions),
    4,
    8,
    fallbacks.definitions
  );
  normalized.insights = enforceCount(
    normalizeStrings(normalized.insights),
    5,
    10,
    fallbacks.insights
  );
  normalized.sources = enforceCount(
    normalizeStrings(normalized.sources),
    3,
    8,
    fallbacks.sources
  );

  return normalized;
}

function buildArticlePayload(profile, options = {}) {
  const generatedAt = new Date();
  const generatedAtIso = generatedAt.toISOString();

  const latestCrimes = profile.safety?.latestCrimes || [];
  const trendRows = profile.safety?.trend?.rows || [];
  const safetyScore = computeSafetyScore(latestCrimes, trendRows).score;

  const lastTrend = trendRows[trendRows.length - 1];
  const prevTrend = trendRows[trendRows.length - 2];

  const month = options.monthYYYYMM || lastTrend?.month || "";
  const currentTotal =
    latestCrimes.length > 0 ? latestCrimes.length : lastTrend?.total ?? null;
  const prevTotal = prevTrend?.total ?? null;

  const categoryCounts = {};
  latestCrimes.forEach((crime) => {
    const cat = crime?.category || "unknown";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const [topCategoryKey] =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || [];

  const topCategory = topCategoryKey ? topCategoryKey.replace(/-/g, " ") : "";

  const topShare =
    currentTotal != null && topCategoryKey
      ? (categoryCounts[topCategoryKey] / currentTotal) * 100
      : null;

  const deltaPct = pctChange(currentTotal, prevTotal);

  const locationName =
    profile.displayName || profile.canonicalName || options.fallbackName || "UK";
  const canonicalSlug = profile.canonicalSlug || slugify(locationName);
  const monthLabel = toMonthLabel(month);
  const slug = slugify(`${canonicalSlug}-${month || "latest"}`);
  const seedKey = options.seedKey || slug;
  const rng = createSeededRng(seedKey);
  const imageRng = createSeededRng(`${seedKey}|images`);

  const postType = pickOne(rng, POST_TYPES) || POST_TYPES[0];
  const narrativeAngle = pickOne(rng, NARRATIVE_ANGLES) || NARRATIVE_ANGLES[0];
  const structureVariant = pickOne(rng, STRUCTURE_VARIANTS) || STRUCTURE_VARIANTS[0];

  const headline = buildHeadline({
    rng,
    locationName,
    monthLabel,
    postType,
    structureVariant,
  });
  const teaser = buildTeaser({
    rng,
    locationName,
    monthLabel,
    narrativeAngle,
  });

  const answerSummary = buildAnswerSummary({
    rng,
    locationName,
    monthLabel,
    currentTotal,
    deltaPct,
    topCategory,
    topShare,
    safetyScore,
    trendRows,
  });

  const executiveSummary = currentTotal != null
    ? `Incident totals for ${locationName} are ${currentTotal} for ${monthLabel}, with the strongest activity in ${topCategory || "key categories"}.`
    : `Incident totals for ${locationName} were not available for ${monthLabel}.`;

  const signals = buildSignals({
    currentTotal,
    prevTotal,
    topCategory,
    topShare,
    trendRows,
    safetyScore,
    monthLabel,
  });

  const insights = buildInsights({
    rng,
    deltaPct,
    topCategory,
    topShare,
    trendRows,
    currentTotal,
    locationName,
  });

  const definitions = buildDefinitions({ rng });

  const { heroImage, gallery } = options.withImages === false
    ? {}
    : selectImagesFromManifest({
        rng: imageRng,
        locationRef: canonicalSlug,
        locationName,
        manifest: options.imageManifest,
        imageTheme: options.imageTheme,
        narrativeAngle,
      });

  return {
    slug,

    // Store as ISO strings for easy Firestore sorting + JSON-LD
    publishDate: generatedAtIso,
    generatedAt: generatedAtIso,

    status: options.status || "draft",
    headline,
    teaser,

    // Keep tags stable; location is already carried by locationRef + headline
    tags: ["Crime Trends", "Monthly Snapshot", "UK"],

    seoTitle: pickOne(rng, [
      headline,
      `${locationName} ${postType} - ${monthLabel}`,
      `${structureVariant}: ${locationName} ${monthLabel}`,
    ]) || headline,
    seoDescription: buildSeoDescription({
      locationName,
      monthLabel,
      postType,
      currentTotal,
      deltaPct,
      rng,
    }),

    locationRef: canonicalSlug || "uk",
    dataMonth: month || "",

    executiveSummary,
    answerSummary,
    definitions,
    signals,
    insights,
    methodology: buildMethodology({ monthLabel }),
    sources: [
      "UK Police API (data.police.uk)",
      "UK Police data portal",
      "OpenStreetMap Nominatim",
      "Area IQ risk scoring model",
    ],

    // Canonical deep link into your report experience
    ctaLink: `/place/${encodeURIComponent(canonicalSlug)}`,

    postType,
    narrativeAngle,
    structureVariant,

    heroImage,
    gallery,
    guardianHeadlines: options.guardianHeadlines?.length ? options.guardianHeadlines : undefined,
  };
}

export async function generateJournalDraftForLocation(locationName, options = {}) {
  const monthParam = /^\d{4}-\d{2}$/.test(options.monthYYYYMM || "") ? options.monthYYYYMM : "";
  const profile = await getAreaProfile({ kind: "place", value: locationName }, { dateYYYYMM: monthParam });
  let guardianHeadlines = [];
  const guardianKey = options.guardianApiKey || process.env.GUARDIAN_API_KEY;
  if (guardianKey) {
    const locationLabel = profile.displayName || profile.canonicalName || locationName;
    const rawGuardian = await fetchGuardianContext(locationLabel, guardianKey, 5);
    guardianHeadlines = rawGuardian.filter((headline) => !headline.title.toLowerCase().includes("opinion"));
  }
  const payload = buildArticlePayload(profile, {
    ...options,
    fallbackName: locationName,
    guardianHeadlines,
  });
  const validated = applyValidationGate(payload, {
    signals: payload.signals,
    definitions: [
      "Incident = a recorded crime event from UK Police data.",
      "Category share = percentage of incidents attributed to the leading category.",
      "Monthly change = percentage difference vs the prior month.",
      "Composite safety index = Area IQ score derived from volume and category mix.",
      "Trend coverage = count of months available in the time series.",
      "Three-month average = mean of the latest three months to smooth volatility.",
    ],
    insights: [
      "Use the latest month as a baseline and review again after the next reporting cycle.",
      "Treat single-month movement as a signal; confirmation requires another month.",
      "Prioritize the leading category because it drives the largest share of incidents.",
      "Short-term spikes should be validated against longer trend coverage.",
      "Mitigation is most effective when focused on dominant categories and hot spots.",
    ],
    sources: [
      "UK Police API (data.police.uk)",
      "UK Police data portal",
      "OpenStreetMap Nominatim",
      "Area IQ risk scoring model",
    ],
  });
  const id = await createJournalArticle(validated);
  return { id, payload: validated };
}

export async function generateJournalDrafts(locations = [], options = {}) {
  const results = [];
  for (const locationName of locations) {
    try {
      const result = await generateJournalDraftForLocation(locationName, options);
      results.push({ locationName, status: "ok", id: result.id, payload: result.payload });
    } catch (error) {
      results.push({ locationName, status: "error", error: error?.message || String(error) });
    }
  }
  return results;
}
