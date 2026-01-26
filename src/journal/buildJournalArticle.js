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

const IMAGE_THEMES = ["street", "aerial", "night", "residential", "generic-uk"];
const TREND_VALUES = new Set(["up", "down", "flat", "volatile"]);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function themeDescription(theme) {
  const descriptions = {
    street: "Street scene",
    aerial: "Aerial view",
    night: "Nighttime street",
    residential: "Residential area",
    "generic-uk": "UK street scene",
  };
  return descriptions[theme] || "Street scene";
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

function pickImages({ location, imageManifest, seed, theme, narrativeAngle }) {
  const manifestItems = Array.isArray(imageManifest) ? imageManifest : [];
  const items = manifestItems
    .filter((item) => isNonEmptyString(item?.filePath))
    .filter((item) => item.filePath.startsWith("/image-bank/"));

  if (!items.length) return {};

  const canonicalSlug = String(location.canonicalSlug || slugify(location.name)).toLowerCase();
  const locationPrefix = canonicalSlug ? `/image-bank/cities/${canonicalSlug}/` : "";
  const cityItems = locationPrefix ? items.filter((item) => item.filePath.startsWith(locationPrefix)) : [];

  let pool = cityItems;
  let resolvedTheme = theme || "street";

  if (!pool.length && canonicalSlug.includes("-")) {
    const alias = canonicalSlug.split("-")[0];
    if (alias && alias !== canonicalSlug) {
      const aliasPrefix = `/image-bank/cities/${alias}/`;
      pool = items.filter((item) => item.filePath.startsWith(aliasPrefix));
    }
  }

  if (!pool.length && resolvedTheme === "generic-uk") {
    pool = items.filter((item) => item.filePath.startsWith("/image-bank/generic-uk/"));
  }

  if (!pool.length) {
    resolvedTheme = resolveImageTheme({ imageTheme: theme, narrativeAngle });
    pool = items.filter((item) => item.filePath.startsWith(`/image-bank/themes/${resolvedTheme}/`));
  }

  if (!pool.length) {
    resolvedTheme = "generic-uk";
    pool = items.filter((item) => item.filePath.startsWith("/image-bank/generic-uk/"));
  }

  if (!pool.length) return {};

  const rng = createSeededRng(seed);
  const heroEntry = pickOne(rng, pool);
  const heroUrl = isNonEmptyString(heroEntry?.filePath) ? heroEntry.filePath.trim() : "";
  const locationName = location.canonicalName || location.name || "UK";
  const altText = `${themeDescription(resolvedTheme)} in ${locationName}`.trim();

  const heroImage = heroUrl
    ? {
        url: heroUrl,
        alt: altText,
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
      alt: altText,
    }))
    .filter((entry) => isNonEmptyString(entry.url));

  const output = {};
  if (heroImage) output.heroImage = heroImage;
  if (gallery.length) output.gallery = gallery;
  return output;
}

function buildSeoTitle(locationName) {
  const title = `${locationName} crime & safety brief`;
  return title.length > 60 ? `${title.slice(0, 57)}...` : title;
}

function buildSeoDescription(locationName, monthLabel, currentTotal) {
  const prefix = currentTotal != null
    ? `${currentTotal} reported incidents`
    : "Latest crime data";
  let text = `${locationName} crime trends for ${monthLabel}. ${prefix} with practical safety guidance and key signals.`;
  if (text.length > 160) {
    text = `${text.slice(0, 157)}...`;
  }
  if (text.length < 150) {
    text = `${text} Updated weekly.`;
  }
  return text;
}

function buildHeadline(locationName, monthLabel, postType, rng) {
  const templates = [
    `${postType}: ${locationName} risk signal for ${monthLabel}`,
    `${locationName} ${postType} for ${monthLabel}`,
    `${locationName} safety brief for ${monthLabel}`,
  ];
  return pickOne(rng, templates);
}

function buildTeaser(locationName, monthLabel) {
  return `Personal safety briefing for ${locationName} using ${monthLabel} police data.`;
}

function buildExecutiveSummary({ locationName, currentTotal, monthLabel, topCategory }) {
  if (currentTotal == null) {
    return `Incident totals are unavailable for ${locationName} in ${monthLabel}.`;
  }
  return `${locationName} recorded ${currentTotal} incidents in ${monthLabel}, led by ${topCategory || "key categories"}.`;
}

function buildAnswerSummary({ locationName, monthLabel, currentTotal, deltaPct, topCategory, topShare, trendCoverageMonths }) {
  const sentences = [];
  if (currentTotal == null) {
    sentences.push(`Incident totals are not available for ${locationName} in ${monthLabel}.`);
  } else {
    sentences.push(`${locationName} recorded ${currentTotal} incidents in ${monthLabel}.`);
  }

  if (deltaPct != null) {
    sentences.push(`That is ${Math.abs(deltaPct).toFixed(1)}% ${deltaPct >= 0 ? "higher" : "lower"} than the prior month.`);
  } else {
    sentences.push("Month-on-month change is not available for this period.");
  }

  if (topCategory) {
    const share = topShare != null ? ` at ${topShare.toFixed(1)}% of incidents` : "";
    sentences.push(`${topCategory} is the leading category${share}.`);
  }

  if (trendCoverageMonths < 3) {
    sentences.push("Confidence is lower due to limited trend coverage.");
  }

  return sentences.slice(0, 3).join(" ");
}

function buildSignals({ currentTotal, prevTotal, deltaPct, topCategory, topShare, trendCoverageMonths, threeMonthAverage, safetyScore, trendRows }) {
  const signals = [];
  const trend = deltaPct == null
    ? detectVolatility(trendRows) ? "volatile" : "flat"
    : deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";

  signals.push({
    label: "Incidents this month",
    value: currentTotal == null ? "Not available" : `${currentTotal}`,
    trend: currentTotal == null || prevTotal == null ? "flat" : trend,
    source: "UK Police API",
  });

  signals.push({
    label: "Change vs previous month",
    value: deltaPct == null ? "Not available" : `${deltaPct.toFixed(1)}%`,
    trend: deltaPct == null ? "flat" : trend,
    source: "UK Police API",
  });

  signals.push({
    label: "Top category share",
    value: topCategory && topShare != null ? `${topCategory} ${topShare.toFixed(1)}%` : "Not available",
    trend: "flat",
    source: "UK Police API",
  });

  signals.push({
    label: "Trend coverage (months)",
    value: trendCoverageMonths ? `${trendCoverageMonths}` : "Not available",
    trend: trendCoverageMonths >= 4 ? "flat" : "volatile",
    source: "UK Police API",
  });

  signals.push({
    label: "3-month average incidents",
    value: threeMonthAverage == null ? "Not available" : `${Math.round(threeMonthAverage)}`,
    trend: "flat",
    source: "UK Police API",
  });

  signals.push({
    label: "Composite safety index",
    value: safetyScore == null ? "Not available" : `${Math.round(safetyScore)}`,
    trend: "flat",
    source: "Area IQ model",
  });

  return signals.slice(0, 7).map((signal) => ({
    ...signal,
    trend: TREND_VALUES.has(signal.trend) ? signal.trend : "flat",
  }));
}

function buildDefinitions() {
  return [
    "Incidents this month = total police reports logged for the latest month.",
    "Trend coverage = number of months available for comparison.",
    "Top category share = percentage attributed to the leading category.",
    "3-month average = rolling mean of the latest three months.",
    "Composite safety index = Area IQ score derived from volume and category mix.",
  ];
}

function buildInsights({ locationName, topCategory, topShare, trendCoverageMonths }) {
  const insights = [];
  insights.push(`Use this brief to plan daily routes and timing in ${locationName}.`);
  if (topCategory && topShare != null) {
    insights.push(`${topCategory} accounts for ${topShare.toFixed(1)}% of incidents, so mitigation should focus there.`);
  }
  if (trendCoverageMonths < 3) {
    insights.push("Limited trend coverage means changes may not be sustained yet.");
  } else {
    insights.push("Three months of data provides a reliable short-term direction signal.");
  }
  insights.push("If you commute late, prioritize well-lit routes and avoid isolated stops.");
  insights.push("Review the next monthly update before changing long-term plans.");
  return insights.slice(0, 8);
}

function buildMethodology(monthLabel) {
  return (
    `Compiled from UK Police recorded crime data for ${monthLabel} and summarized by month and category. ` +
    "Totals reflect reported incidents available for the selected boundary.\n\n" +
    "Limitations include reporting delays, boundary matching, and category reclassification that can affect totals."
  );
}

function buildSources(contextLink) {
  const sources = [
    "UK Police API (data.police.uk)",
    "OpenStreetMap Nominatim",
  ];
  if (contextLink?.url) {
    sources.push(`The Guardian (${contextLink.url})`);
  } else {
    sources.push("The Guardian");
  }
  return sources;
}

function buildContextLink(guardianHeadlines = []) {
  if (!guardianHeadlines.length) return null;
  const primary = guardianHeadlines[0];
  return {
    title: primary.title,
    url: primary.url,
    source: "The Guardian",
    publishedAt: primary.publishedAt,
    category: primary.section || "UK News",
  };
}

export function validateArticlePayload(payload) {
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
    "status",
  ];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null);
  if (missing.length) {
    throw new Error(`Journal article validation failed: missing ${missing.join(", ")}`);
  }
}

export function buildJournalArticle({ location, crimeStats, guardianHeadlines, imageManifest, options = {} }) {
  if (!location?.name) {
    throw new Error("Journal article requires location");
  }
  if (!crimeStats) {
    throw new Error(`Journal article requires crimeStats for ${location.name}`);
  }
  if (!Array.isArray(guardianHeadlines)) {
    throw new Error("guardianHeadlines must be an array");
  }

  const generatedAt = new Date();
  const generatedAtIso = generatedAt.toISOString();
  const publishDateIso = generatedAtIso;

  const canonicalSlug = location.canonicalSlug || slugify(location.name);
  const canonicalName = location.canonicalName || location.name;
  const monthLabel = crimeStats.monthLabel || "Latest";
  const monthSlug = monthLabel === "Latest" ? "latest" : monthLabel;
  const slug = slugify(`${canonicalSlug}-${monthSlug}`);

  const seed = `${slug}-${monthSlug}`;
  const rng = createSeededRng(seed);

  const postType = options.postType || pickOne(rng, POST_TYPES);
  const narrativeAngle = options.narrativeAngle || pickOne(rng, NARRATIVE_ANGLES);
  const structureVariant = options.structureVariant || pickOne(rng, STRUCTURE_VARIANTS);

  const currentTotal = crimeStats.currentTotal ?? null;
  const prevTotal = crimeStats.prevTotal ?? null;
  const deltaPct = pctChange(currentTotal, prevTotal);

  const trendRows = Array.isArray(crimeStats.trendRows) ? crimeStats.trendRows : [];
  const trendCoverageMonths = crimeStats.trendCoverageMonths ?? trendRows.length ?? 0;

  const headline = buildHeadline(canonicalName, monthLabel, postType, rng);
  const teaser = buildTeaser(canonicalName, monthLabel);

  const answerSummary = buildAnswerSummary({
    locationName: canonicalName,
    monthLabel,
    currentTotal,
    deltaPct,
    topCategory: crimeStats.topCategory,
    topShare: crimeStats.topShare,
    trendCoverageMonths,
  });
  const executiveSummary = buildExecutiveSummary({
    locationName: canonicalName,
    currentTotal,
    monthLabel,
    topCategory: crimeStats.topCategory,
  });

  const signals = buildSignals({
    currentTotal,
    prevTotal,
    deltaPct,
    topCategory: crimeStats.topCategory,
    topShare: crimeStats.topShare,
    trendCoverageMonths,
    threeMonthAverage: crimeStats.threeMonthAverage,
    safetyScore: crimeStats.safetyScore,
    trendRows,
  });

  const definitions = buildDefinitions();
  const insights = buildInsights({
    locationName: canonicalName,
    topCategory: crimeStats.topCategory,
    topShare: crimeStats.topShare,
    trendCoverageMonths,
  });

  const methodology = buildMethodology(monthLabel);
  const contextLink = buildContextLink(guardianHeadlines);
  const sources = buildSources(contextLink);

  const seoTitle = buildSeoTitle(canonicalName);
  const seoDescription = buildSeoDescription(canonicalName, monthLabel, currentTotal);

  const images = options.withImages === false
    ? {}
    : pickImages({
        location,
        imageManifest,
        seed,
        theme: options.imageTheme,
        narrativeAngle,
      });

  const payload = {
    slug,
    status: options.status || "draft",
    publishDate: publishDateIso,
    generatedAt: generatedAtIso,

    headline,
    teaser,
    executiveSummary,
    answerSummary,

    signals,
    definitions,
    insights,
    methodology,
    sources,

    tags: ["Crime Trends", "Monthly Snapshot", "UK"],
    locationRef: canonicalSlug,
    dataMonth: monthLabel === "Latest" ? "" : monthLabel,

    seoTitle,
    seoDescription,
    canonicalPath: `/journal/${slug}`,

    ctaLink: `/place/${encodeURIComponent(canonicalSlug)}`,

    heroImage: images.heroImage,
    gallery: images.gallery,

    guardianHeadlines: guardianHeadlines.length ? guardianHeadlines : undefined,
  };

  validateArticlePayload(payload);
  return payload;
}

export { pickImages };
