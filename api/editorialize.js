let initError = null;
let handler = null;

const MODEL_CACHE_MS = 10 * 60 * 1000;
let modelCache = { name: null, fetchedAt: 0 };
globalThis.__EDITORIALIZE_MODEL_CACHE__ = modelCache;
const inflight = new Map();
const RESULT_CACHE_MS = 5 * 60 * 1000;
const resultCache = new Map();

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
  const retryAfterSeconds = Number.isFinite(payload?.retryAfterSeconds)
    ? payload.retryAfterSeconds
    : Number.isFinite(payload?.retryAfterMs)
      ? Math.ceil(payload.retryAfterMs / 1000)
      : null;
  if (status === 429 && Number.isFinite(retryAfterSeconds)) {
    res.setHeader("Retry-After", String(Math.max(1, retryAfterSeconds)));
  }
  res.status(status).json(payload);
}

function redactKey(input) {
  if (!input) return "";
  return String(input).replace(/key=([^&\s]+)/gi, "key=REDACTED");
}

function makeSafeHeaders(extra = {}) {
  const headers = { ...extra };
  for (const key of Object.keys(headers)) {
    if (/^(expect|connection|content-length|transfer-encoding|host)$/i.test(key)) {
      delete headers[key];
    }
  }
  return headers;
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
    phase,
    stack: process.env.NODE_ENV !== "production" ? stack : undefined,
  });
}

async function robustReadJson(req) {
  const rawFromBody = (value) => {
    if (Buffer.isBuffer(value)) return value.toString("utf8");
    if (typeof value === "string") return value;
    return "";
  };

  let rawBody = "";
  let body = undefined;
  let parseError = null;

  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    body = req.body;
    return { body, rawBody: "", rawLength: 0, parseError: null };
  }

  if (req?.body) {
    rawBody = rawFromBody(req.body);
  }

  if (!rawBody) {
    rawBody = await new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => resolve(raw));
      req.on("error", () => resolve(raw));
    });
  }

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      parseError = err;
      body = undefined;
    }
  } else {
    body = undefined;
  }

  return {
    body,
    rawBody,
    rawLength: rawBody ? rawBody.length : 0,
    parseError,
  };
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

function normalizeMonthLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "latest";
  if (raw.toLowerCase() === "latest") return "latest";
  return raw;
}

function buildRequestKey(location, crimeStats) {
  const locationLabel =
    location?.canonicalSlug || location?.canonicalName || location?.displayName || location?.name || "unknown";
  const slug = slugify(locationLabel) || "unknown";
  const monthLabel = normalizeMonthLabel(crimeStats?.monthLabel || crimeStats?.dataMonth || "latest");
  return `${slug}:${monthLabel}`.toLowerCase();
}

function getCachedResult(key) {
  const cached = resultCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > RESULT_CACHE_MS) {
    resultCache.delete(key);
    return null;
  }
  return { status: cached.status, payload: cached.payload };
}

function setCachedResult(key, status, payload) {
  resultCache.set(key, { status, payload, createdAt: Date.now() });
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

function buildRepairPrompt(input) {
  return `You are the Intelligence Editor for Area IQ.

Return ONLY valid JSON. No code fences. No commentary. No trailing text.
You MUST output the full object. Do not truncate.
Follow the schema exactly and include every required field.

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
  return (...args) => import("node-fetch").then((m) => m.default(...args));
}

function normalizeModelName(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

async function listModels(apiKey) {
  const fetchFn = getFetchFn();
  if (!fetchFn) throw new Error("Fetch unavailable");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchFn(url, { headers: makeSafeHeaders() });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ListModels failed: ${response.status} ${redactKey(text).slice(0, 200)}`);
  }
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("ListModels returned invalid JSON");
  }
  const models = Array.isArray(data?.models) ? data.models : [];
  return models.filter((model) =>
    Array.isArray(model.supportedGenerationMethods) &&
    model.supportedGenerationMethods.includes("generateContent")
  );
}

function pickBestModel(models) {
  if (!Array.isArray(models) || !models.length) return "";
  const pickBy = (re) => models.find((model) => re.test(model.name));
  const flash25 = pickBy(/gemini-2\.5-.*flash/i);
  if (flash25?.name) return flash25.name;
  const flash = pickBy(/flash/i);
  if (flash?.name) return flash.name;
  const pro = pickBy(/pro/i);
  if (pro?.name) return pro.name;
  return models[0].name || "";
}

async function getGeminiModel(apiKey) {
  const now = Date.now();
  if (modelCache.name && now - modelCache.fetchedAt < MODEL_CACHE_MS) {
    return modelCache.name;
  }
  const models = await listModels(apiKey);
  const picked = pickBestModel(models);
  if (!picked) {
    throw new Error("No models support generateContent");
  }
  modelCache = { name: picked, fetchedAt: Date.now() };
  globalThis.__EDITORIALIZE_MODEL_CACHE__ = modelCache;
  return picked;
}

async function refreshGeminiModel(apiKey) {
  modelCache = { name: null, fetchedAt: 0 };
  globalThis.__EDITORIALIZE_MODEL_CACHE__ = modelCache;
  return getGeminiModel(apiKey);
}

function missingFields(payload, fields) {
  return fields.filter((field) => payload?.[field] == null || payload?.[field] === "");
}

function validateArticleSchema(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return ["payload is not an object"];
  }
  if (!isNonEmptyString(payload.slug)) errors.push("slug must be a non-empty string");
  if (!isNonEmptyString(payload.headline)) errors.push("headline must be a non-empty string");
  if (!isNonEmptyString(payload.teaser)) errors.push("teaser must be a non-empty string");
  if (!isNonEmptyString(payload.publishDate)) errors.push("publishDate must be a string");
  if (!isNonEmptyString(payload.generatedAt)) errors.push("generatedAt must be a string");
  if (!["draft", "published"].includes(payload.status)) errors.push("status must be draft|published");
  if (!Array.isArray(payload.signals)) errors.push("signals must be an array");
  if (!Array.isArray(payload.definitions)) errors.push("definitions must be an array");
  if (!Array.isArray(payload.insights)) errors.push("insights must be an array");
  if (!Array.isArray(payload.sources)) errors.push("sources must be an array");
  if (!Array.isArray(payload.tags)) errors.push("tags must be an array");
  if (payload.heroImage && typeof payload.heroImage !== "object") errors.push("heroImage must be an object");
  if (payload.gallery && !Array.isArray(payload.gallery)) errors.push("gallery must be an array");
  return errors;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(attempt) {
  const base = 250 * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * 120);
  return base + jitter;
}

function isRetryableStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function getRetryAfterSeconds(res) {
  const value = res?.headers?.get ? res.headers.get("retry-after") : null;
  if (!value) return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const deltaMs = date - Date.now();
    return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : null;
  }
  return null;
}

async function fetchWithRetry(fetchFn, url, options, { retries = 4, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  while (true) {
    attempt += 1;
    let response;
    try {
      response = await fetchFn(url, options);
    } catch (error) {
      if (attempt > retries) throw error;
      const waitMs = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await sleep(waitMs);
      continue;
    }

    if (!response || !isRetryableStatus(response.status) || attempt > retries) {
      return response;
    }

    const retryAfter = getRetryAfterSeconds(response);
    const waitMs = retryAfter ? retryAfter * 1000 : baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
    await sleep(waitMs);
  }
}

function createHandler() {
  safeDotenv();
  const { validateAndNormalizeMedia } = require("../lib/mediaValidator");
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const lastGeminiCall = new Map();
  const GEMINI_COOLDOWN_MS = 8000;

  return async (req, res) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
    }

    const { body, rawBody, rawLength } = await robustReadJson(req);
    const contentType = req.headers ? req.headers["content-type"] : undefined;

    const { location, crimeStats, imageManifest } = body || {};
    const guardianHeadlines = Array.isArray(body?.guardianHeadlines) ? body.guardianHeadlines : [];
    const options = body?.options && typeof body.options === "object" ? body.options : {};
    const rawUseGemini = body?.useGemini;
    const useGemini =
      rawUseGemini === undefined
        ? true
        : rawUseGemini === true || String(rawUseGemini).toLowerCase() === "true";
    const locationLabel = location?.displayName || location?.canonicalName || location?.name || "unknown";

    res.setHeader("X-Editorialize-Mode", useGemini ? "gemini" : "fallback");

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[editorialize] useGemini=${useGemini} keyPresent=${Boolean(GEMINI_API_KEY)} location=${locationLabel}`
      );
      console.info(
        `[editorialize] useGemini=${useGemini} raw=${JSON.stringify(rawUseGemini)} type=${typeof rawUseGemini}`
      );
    }

    if (!location || !crimeStats || !Array.isArray(imageManifest)) {
      return sendJson(res, 400, {
        error: "INVALID_INPUT",
        required: ["location", "crimeStats", "imageManifest"],
        received: {
          contentType,
          hasBody: Boolean(body),
          bodyType: typeof body,
          keys: body ? Object.keys(body) : [],
          hasLocation: Boolean(body?.location),
          hasCrimeStats: Boolean(body?.crimeStats),
          imageManifestIsArray: Array.isArray(body?.imageManifest),
          rawLength,
          rawPreview: redactKey(rawBody || "").slice(0, 300),
        },
      });
    }

    const requestKey = buildRequestKey(location, crimeStats);
    const cached = getCachedResult(requestKey);
    if (cached) {
      return sendJson(res, cached.status || 200, cached.payload);
    }

    if (inflight.has(requestKey)) {
      const result = await inflight.get(requestKey);
      return sendJson(res, result.status, result.payload);
    }

    const resultPromise = (async () => {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress ||
        "unknown";

      if (useGemini) {
        const last = lastGeminiCall.get(ip) || 0;
        const now = Date.now();

        if (now - last < GEMINI_COOLDOWN_MS) {
          const retryAfterMs = GEMINI_COOLDOWN_MS - (now - last);
          const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
          return {
            status: 429,
            payload: {
              error: "RATE_LIMITED_GEMINI",
              message: "Editorial engine busy. Try again soon.",
              retryAfterMs,
              retryAfterSeconds,
            },
          };
        }

        lastGeminiCall.set(ip, now);
      }

      if (useGemini && !GEMINI_API_KEY) {
        return {
          status: 500,
          payload: {
            error: "missing_env",
            missing: ["GEMINI_API_KEY"],
            message:
              "Gemini is required for editorialize mode. Add GEMINI_API_KEY to Vercel env and/or run `npm run env:pull`.",
          },
        };
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
            return { status: 200, payload: normalized };
          } catch (mediaError) {
            return {
              status: 500,
              payload: {
                error: "MEDIA_VALIDATION_FAILED",
                message: mediaError?.message || String(mediaError),
                phase: "fallback",
              },
            };
          }
        } catch (error) {
          return { status: 500, payload: { error: "FALLBACK_ERROR", details: String(error) } };
        }
      }

      const fetchFn = getFetchFn();
      const prompt = buildPrompt({ location, crimeStats, guardianHeadlines, imageManifest });
      const repairPrompt = buildRepairPrompt({ location, crimeStats, guardianHeadlines, imageManifest });
      const REQUIRED_FIELDS = [
        "slug",
        "status",
        "publishDate",
        "generatedAt",
        "headline",
        "teaser",
        "seoTitle",
        "seoDescription",
        "locationRef",
        "dataMonth",
        "executiveSummary",
        "answerSummary",
        "signals",
        "definitions",
        "insights",
        "methodology",
        "sources",
        "ctaLink",
        "tags",
      ];

      try {
        const override = normalizeModelName(process.env.GEMINI_MODEL);
        let modelName = override;
        if (!modelName) {
          modelName = await getGeminiModel(GEMINI_API_KEY);
        }

        let attempt = 0;
        while (attempt < 2) {
          attempt += 1;
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${encodeURIComponent(
            GEMINI_API_KEY
          )}`;
          let jsonAttempt = 0;
          let promptToUse = prompt;

          while (jsonAttempt < 2) {
            jsonAttempt += 1;
            const response = await fetchWithRetry(
              fetchFn,
              endpoint,
              {
                method: "POST",
                headers: makeSafeHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: promptToUse }] }],
                  generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2000,
                    responseMimeType: "application/json",
                  },
                }),
              },
              { retries: 4, baseDelayMs: 500 }
            );

            if (!response.ok) {
              const errorText = await response.text();
              if (response.status === 404 && !override && attempt === 1) {
                modelName = await refreshGeminiModel(GEMINI_API_KEY);
                break;
              }
              if (response.status === 429) {
                const retryAfterSeconds = getRetryAfterSeconds(response);
                return {
                  status: 429,
                  payload: {
                    error: "RATE_LIMITED_GEMINI",
                    message: "Editorial engine busy. Try again soon.",
                    retryAfterSeconds,
                  },
                };
              }
              if (isRetryableStatus(response.status)) {
                return {
                  status: 503,
                  payload: {
                    error: "GEMINI_UNAVAILABLE",
                    status: response.status,
                    message: "Editorial engine temporarily unavailable.",
                  },
                };
              }
              return {
                status: 500,
                payload: {
                  error: "GEMINI_REQUEST_FAILED",
                  status: response.status,
                  details: redactKey(errorText).slice(0, 500),
                },
              };
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleaned = stripCodeFences(text);

            let parsed;
            try {
              parsed = JSON.parse(cleaned);
            } catch (parseError) {
              if (jsonAttempt < 2) {
                promptToUse = repairPrompt;
                continue;
              }
              return {
                status: 500,
                payload: {
                  error: "GEMINI_INVALID_JSON",
                  sample: cleaned.slice(0, 600),
                },
              };
            }

            const missing = missingFields(parsed, REQUIRED_FIELDS);
            if (missing.length) {
              if (jsonAttempt < 2) {
                promptToUse = repairPrompt;
                continue;
              }
              return {
                status: 500,
                payload: {
                  error: "GEMINI_SCHEMA_INVALID",
                  missing,
                  sample: cleaned.slice(0, 500),
                },
              };
            }

            const schemaErrors = validateArticleSchema(parsed);
            if (schemaErrors.length) {
              return {
                status: 500,
                payload: {
                  error: "GEMINI_SCHEMA_INVALID",
                  details: schemaErrors,
                },
              };
            }

            try {
              const normalized = validateAndNormalizeMedia(parsed);
              return { status: 200, payload: normalized };
            } catch (mediaError) {
              return {
                status: 500,
                payload: {
                  error: "MEDIA_VALIDATION_FAILED",
                  message: mediaError?.message || String(mediaError),
                  phase: "gemini",
                },
              };
            }
          }
        }
      } catch (error) {
        return { status: 500, payload: { error: "GEMINI_ERROR", details: redactKey(String(error)) } };
      }

      return {
        status: 500,
        payload: { error: "GEMINI_ERROR", details: "Unknown editorialize failure." },
      };
    })();

    inflight.set(requestKey, resultPromise);
    let result;
    try {
      result = await resultPromise;
    } catch (error) {
      result = { status: 500, payload: { error: "EDITORIALIZE_ERROR", message: String(error?.message || error) } };
    } finally {
      inflight.delete(requestKey);
    }

    if (result?.status === 200) {
      setCachedResult(requestKey, result.status, result.payload);
    }

    return sendJson(res, result?.status || 500, result?.payload || { error: "EDITORIALIZE_ERROR" });
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
