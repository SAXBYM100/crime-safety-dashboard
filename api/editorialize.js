let initError = null;
let handler = null;
let modelCache = { name: null, fetchedAt: 0 };

function safeDotenv() {
  try {
    require("dotenv").config({ path: ".env.local" });
    require("dotenv").config();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[editorialize] dotenv load failed:", error);
    }
  }
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function sendCrash(res, error, phase) {
  const message = error?.message || String(error);
  const stack = String(error?.stack || "").split("\n").slice(0, 8).join("\n");
  if (process.env.NODE_ENV !== "production") {
    console.error(`[editorialize] crash (${phase}):`, error);
  }
  return sendJson(res, 500, {
    error: "EDITORIALIZE_CRASH",
    message,
    stack,
    phase,
  });
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function stripCodeFences(text) {
  if (!text) return "";
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function pickImages({ imageManifest, canonicalSlug, locationName }) {
  const items = Array.isArray(imageManifest)
    ? imageManifest.filter((item) => isNonEmptyString(item?.filePath))
    : [];
  if (!items.length) return {};

  const prefix = canonicalSlug ? `/image-bank/cities/${canonicalSlug}/` : "";
  let pool = prefix ? items.filter((item) => item.filePath.startsWith(prefix)) : [];
  if (!pool.length) pool = items;

  const alt = `Street scene in ${locationName}`.trim();
  const heroEntry = pool[0];
  const heroImage = heroEntry
    ? {
        url: heroEntry.filePath.trim(),
        alt,
        credit: String(heroEntry.creditLine || ""),
      }
    : undefined;

  const gallery = pool
    .slice(1, 4)
    .map((entry) => ({
      url: entry.filePath.trim(),
      alt,
    }))
    .filter((entry) => isNonEmptyString(entry.url) && isNonEmptyString(entry.alt));

  const output = {};
  if (heroImage && isNonEmptyString(heroImage.url) && isNonEmptyString(heroImage.alt)) {
    output.heroImage = heroImage;
  }
  if (gallery.length) output.gallery = gallery;
  return output;
}

function buildFallbackArticle({ location, crimeStats, imageManifest, options }) {
  const now = new Date().toISOString();
  const locationName = location?.canonicalName || location?.displayName || location?.name || "UK";
  const canonicalSlug = location?.canonicalSlug || slugify(locationName);
  const monthLabel = crimeStats?.monthLabel || crimeStats?.dataMonth || "Latest";
  const dataMonth = monthLabel === "Latest" ? "" : monthLabel;
  const slug = slugify(`${canonicalSlug}-${dataMonth || "latest"}`);

  const incidents = crimeStats?.incidentsThisMonth ?? crimeStats?.currentTotal ?? null;
  const topCategory = crimeStats?.topCategory || "";
  const categoryShareRaw = crimeStats?.categoryShare ?? crimeStats?.topShare ?? null;
  const threeMonthAverageRaw = crimeStats?.threeMonthAverage ?? null;
  const trendCoverageMonthsRaw = crimeStats?.trendCoverageMonths ?? null;

  const categoryShare = Number.isFinite(categoryShareRaw) ? categoryShareRaw : null;
  const threeMonthAverage = Number.isFinite(threeMonthAverageRaw) ? threeMonthAverageRaw : null;
  const trendCoverageMonths = Number.isFinite(trendCoverageMonthsRaw) ? trendCoverageMonthsRaw : null;

  const headline = `${locationName} safety brief ${monthLabel === "Latest" ? "(latest)" : `for ${monthLabel}`}`;
  const teaser = `A concise safety briefing for ${locationName} based on the latest police data.`;

  const answerSummary = incidents == null
    ? `Incident totals are unavailable for ${locationName} in ${monthLabel}.`
    : `${locationName} recorded ${incidents} reported incidents in ${monthLabel}.`;

  const executiveSummary = topCategory
    ? `${topCategory} is the leading category in ${locationName} for ${monthLabel}.`
    : `Category mix is unavailable for ${locationName} in ${monthLabel}.`;

  const signals = [
    {
      label: "Incidents this month",
      value: incidents == null ? "Not available" : `${incidents}`,
      trend: "flat",
      source: "UK Police API",
    },
    {
      label: "Top category share",
      value: topCategory && categoryShare != null ? `${topCategory} ${categoryShare.toFixed(1)}%` : "Not available",
      trend: "flat",
      source: "UK Police API",
    },
    {
      label: "3-month average incidents",
      value: threeMonthAverage == null ? "Not available" : `${Math.round(threeMonthAverage)}`,
      trend: "flat",
      source: "UK Police API",
    },
    {
      label: "Trend coverage (months)",
      value: trendCoverageMonths == null ? "Not available" : `${trendCoverageMonths}`,
      trend: trendCoverageMonths >= 4 ? "flat" : "volatile",
      source: "UK Police API",
    },
  ];

  const definitions = [
    "Incidents this month = total police reports for the latest month.",
    "Top category share = percentage attributed to the leading category.",
    "3-month average = rolling mean of the latest three months.",
    "Trend coverage = number of months available for comparison.",
  ];

  const insights = [
    `Use this brief to plan daily routes and timing in ${locationName}.`,
    "Short-term changes should be treated as signals until a second month confirms direction.",
    "Focus mitigations on the dominant category to reduce the largest share of incidents.",
  ];

  const methodology =
    `Compiled from UK Police recorded crime data for ${monthLabel}. ` +
    "Totals reflect reported incidents available for the selected boundary.";

  const sources = [
    "UK Police API (data.police.uk)",
    "OpenStreetMap Nominatim",
  ];

  const seoTitle = `${locationName} crime & safety brief`;
  const seoDescription = `${locationName} crime trends for ${monthLabel}. ${incidents == null ? "Latest data" : `${incidents} reported incidents`} with practical safety guidance.`;

  const images = pickImages({ imageManifest, canonicalSlug, locationName });

  return {
    slug,
    status: options?.status || "draft",
    publishDate: now,
    generatedAt: now,
    headline,
    teaser,
    seoTitle,
    seoDescription,
    locationRef: canonicalSlug,
    dataMonth,
    executiveSummary,
    answerSummary,
    signals,
    definitions,
    insights,
    methodology,
    sources,
    ctaLink: `/place/${encodeURIComponent(canonicalSlug)}`,
    tags: ["Crime Trends", "Monthly Snapshot", "UK"],
    heroImage: images.heroImage,
    gallery: images.gallery,
  };
}

function buildPrompt(input) {
  return `You are the Intelligence Editor for Area IQ.

Rules:
- Calm, decision-ready, UK spelling, no filler. Make it compelling.
- Interpret stats; do not restate raw numbers repeatedly.
- Include "so what" impact for residents, movers, businesses.
- Signal vs noise: call out uncertainty if trend depth is shallow.
- Use Guardian headlines as context only; never claim causality.
- Never invent events, numbers, or sources.
- Use ONLY local images from imageManifest; select heroImage first.
- Prefer /image-bank/cities/{canonicalSlug} then /themes then /generic-uk.
- Do not include markdown.
- Output a single JSON object ONLY, matching schema exactly.

Schema:
{
  "slug": string,
  "status": "draft"|"published",
  "publishDate": ISO string,
  "generatedAt": ISO string,
  "headline": string,
  "teaser": string,
  "seoTitle": string,
  "seoDescription": string,
  "locationRef": string,
  "dataMonth": string,
  "executiveSummary": string,
  "answerSummary": string,
  "signals": [{ "label": string, "value": string, "trend": "up"|"down"|"flat"|"volatile", "source": string }],
  "definitions": string[],
  "insights": string[],
  "methodology": string,
  "sources": string[],
  "ctaLink": string,
  "tags": string[],
  "heroImage": { "url": string, "alt": string, "credit": string },
  "gallery": [{ "url": string, "alt": string }]
}

Input JSON:
${JSON.stringify(input)}
`;
}

function getFetchFn() {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  try {
    // node-fetch v2 for CommonJS compatibility
    return require("node-fetch");
  } catch (error) {
    return null;
  }
}

function normalizeModelName(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

async function listModels(fetchFn, apiKey) {
  if (!fetchFn) throw new Error("Fetch unavailable");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchFn(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ListModels failed: ${response.status} ${text.slice(0, 200)}`);
  }
  const data = await response.json();
  return Array.isArray(data?.models) ? data.models : [];
}

function pickBestModel(models) {
  const supportsGenerate = models.filter((model) =>
    Array.isArray(model.supportedGenerationMethods) &&
    model.supportedGenerationMethods.includes("generateContent")
  );
  if (!supportsGenerate.length) return "";
  const flash = supportsGenerate.find((model) => /flash/i.test(model.name));
  if (flash?.name) return flash.name;
  const pro = supportsGenerate.find((model) => /pro/i.test(model.name));
  if (pro?.name) return pro.name;
  return supportsGenerate[0].name || "";
}

async function resolveModelName(fetchFn, apiKey) {
  const override = normalizeModelName(process.env.GEMINI_MODEL);
  if (override) return { name: override, override: true };
  if (modelCache.name) return { name: modelCache.name, override: false };
  const models = await listModels(fetchFn, apiKey);
  const picked = pickBestModel(models);
  if (!picked) {
    throw new Error("No models support generateContent");
  }
  modelCache = { name: picked, fetchedAt: Date.now() };
  return { name: picked, override: false };
}

async function refreshModelName(fetchFn, apiKey) {
  modelCache = { name: null, fetchedAt: 0 };
  return resolveModelName(fetchFn, apiKey);
}

function createHandler() {
  safeDotenv();
  const { validateAndNormalizeMedia } = require("../lib/mediaValidator");
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const fetchFn = getFetchFn();

  return async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const body = await readBody(req);
  const { location, crimeStats, imageManifest } = body || {};
  const guardianHeadlines = Array.isArray(body?.guardianHeadlines) ? body.guardianHeadlines : [];
  const options = body?.options && typeof body.options === "object" ? body.options : {};
  const useGemini = body?.useGemini !== false;
  const locationLabel = location?.displayName || location?.canonicalName || location?.name || "unknown";

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[editorialize] useGemini=${useGemini} keyPresent=${Boolean(GEMINI_API_KEY)} location=${locationLabel}`
    );
  }

  if (!location || !crimeStats || !Array.isArray(imageManifest)) {
    return sendJson(res, 400, {
      error: "INVALID_INPUT",
      required: ["location", "crimeStats", "imageManifest"],
    });
  }

  if (useGemini && !GEMINI_API_KEY) {
    return sendJson(res, 500, {
      error: "missing_env",
      missing: ["GEMINI_API_KEY"],
      message: "Gemini is required for editorialize mode. Add GEMINI_API_KEY to Vercel env and/or run `npm run env:pull`.",
    });
  }

  if (!useGemini) {
    try {
      const fallback = await buildFallbackArticle({
        location,
        crimeStats,
        imageManifest,
        options,
      });
      try {
        const normalized = validateAndNormalizeMedia(fallback);
        return sendJson(res, 200, normalized);
      } catch (mediaError) {
        return sendJson(res, 500, {
          error: "MEDIA_VALIDATION_FAILED",
          message: mediaError?.message || String(mediaError),
        });
      }
    } catch (error) {
      return sendJson(res, 500, { error: "FALLBACK_ERROR", details: String(error) });
    }
  }

  if (!fetchFn) {
    return sendJson(res, 500, {
      error: "FETCH_UNAVAILABLE",
      message: "Fetch is not available in this runtime. Install node-fetch or upgrade Node.",
    });
  }

  const prompt = buildPrompt({ location, crimeStats, guardianHeadlines, imageManifest });

  try {
    const { name: modelName, override } = await resolveModelName(fetchFn, GEMINI_API_KEY);
    let attempt = 0;
    while (attempt < 2) {
      attempt += 1;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY
      )}`;
      const response = await fetchFn(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 404 && !override && attempt === 1) {
          await refreshModelName(fetchFn, GEMINI_API_KEY);
          continue;
        }
        return sendJson(res, 500, { error: "GEMINI_REQUEST_FAILED", details: errorText.slice(0, 500) });
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = stripCodeFences(text);

      try {
        const parsed = JSON.parse(cleaned);
        try {
          const normalized = validateAndNormalizeMedia(parsed);
          return sendJson(res, 200, normalized);
        } catch (mediaError) {
          return sendJson(res, 500, {
            error: "MEDIA_VALIDATION_FAILED",
            message: mediaError?.message || String(mediaError),
          });
        }
      } catch (parseError) {
        return sendJson(res, 500, {
          error: "GEMINI_INVALID_JSON",
          sample: cleaned.slice(0, 500),
        });
      }
    }
  } catch (error) {
    return sendJson(res, 500, { error: "GEMINI_ERROR", details: String(error) });
  }
  };
}

try {
  handler = createHandler();
} catch (error) {
  initError = error;
}

module.exports = async (req, res) => {
  if (initError) return sendCrash(res, initError, "init");
  try {
    return await handler(req, res);
  } catch (error) {
    return sendCrash(res, error, "handler");
  }
};
