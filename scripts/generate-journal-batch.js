// scripts/generate-journal-batch.js
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { pathToFileURL } = require("url");
const { validateAndNormalizeMedia } = require("../lib/mediaValidator");

// Env (server only):
// GEMINI_API_KEY
// GUARDIAN_API_KEY (optional)
// GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON
// EDITORIAL_API_BASE_URL (optional)

const PROJECT_ROOT = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(PROJECT_ROOT, ".env.local") });
require("dotenv").config({ path: path.join(PROJECT_ROOT, ".env") });
const IMAGE_MANIFEST_PATH = path.join(PROJECT_ROOT, "public", "image-bank", "manifest.json");
const CITIES_PATH = path.join(PROJECT_ROOT, "src", "data", "cities.json");

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const jsonPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    }
  }
  return null;
}

function initAdmin() {
  if (admin.apps.length) return admin;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

function parseArgs(argv) {
  const options = {
    count: 5,
    status: "draft",
    month: "",
    overwrite: false,
    useGemini: true,
  };
  argv.forEach((arg) => {
    if (arg.startsWith("--count=")) options.count = Number(arg.split("=")[1] || 5);
    if (arg.startsWith("--status=")) options.status = arg.split("=")[1] || "draft";
    if (arg.startsWith("--month=")) options.month = arg.split("=")[1] || "";
    if (arg.startsWith("--overwrite=")) options.overwrite = arg.split("=")[1] === "true";
    if (arg.startsWith("--useGemini=")) options.useGemini = arg.split("=")[1] !== "false";
  });
  return options;
}

function loadImageManifest() {
  if (!fs.existsSync(IMAGE_MANIFEST_PATH)) return [];
  const raw = fs.readFileSync(IMAGE_MANIFEST_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function loadLocations() {
  if (!fs.existsSync(CITIES_PATH)) {
    return ["London", "Manchester", "Birmingham", "Bristol"].map((name) => ({
      name,
      canonicalName: name,
      canonicalSlug: name.toLowerCase(),
    }));
  }
  const raw = JSON.parse(fs.readFileSync(CITIES_PATH, "utf8"));
  return Object.entries(raw).map(([slug, city]) => ({
    name: city.name,
    canonicalName: city.name,
    canonicalSlug: slug,
    lat: city.lat,
    lng: city.lng,
    population: city.population,
    policeForce: city.policeForce,
  }));
}

async function fetchGuardianHeadlines(locationName, limit = 5) {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({
    q: locationName,
    "page-size": limit,
    "order-by": "newest",
    "show-fields": "trailText",
    "api-key": apiKey,
    section: "uk-news|society|cities|crime|politics",
  });
  try {
    const res = await fetch(`https://content.guardianapis.com/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.response?.results || []).map((a) => ({
      title: a.webTitle,
      url: a.webUrl,
      section: a.sectionName || "UK News",
      publishedAt: a.webPublicationDate,
    }));
    return items.filter((headline) => !headline.title.toLowerCase().includes("opinion"));
  } catch (error) {
    console.warn("Guardian fetch failed.", error);
    return [];
  }
}

async function fetchCrimeStats(location, monthYYYYMM) {
  const modulePath = pathToFileURL(path.join(PROJECT_ROOT, "src", "journal", "fetchCrimeStats.js")).href;
  const mod = await import(modulePath);
  return mod.fetchCrimeStats(location, { monthYYYYMM });
}

function deepStripUndefined(input) {
  if (Array.isArray(input)) {
    return input
      .map((entry) => deepStripUndefined(entry))
      .filter((entry) => entry !== undefined);
  }
  if (input && typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
      const cleaned = deepStripUndefined(value);
      if (cleaned !== undefined) output[key] = cleaned;
    });
    return output;
  }
  return input;
}

function stripEmptyObjectsDeep(input) {
  if (Array.isArray(input)) {
    const cleaned = input
      .map((entry) => stripEmptyObjectsDeep(entry))
      .filter((entry) => entry !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (input && typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
      const cleaned = stripEmptyObjectsDeep(value);
      if (cleaned !== undefined) output[key] = cleaned;
    });
    return Object.keys(output).length ? output : undefined;
  }
  return input;
}

async function callEditorialize(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/api/editorialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`editorialize failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = initAdmin();
  const db = app.firestore();

  const baseUrl = (process.env.EDITORIAL_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
  const imageManifest = loadImageManifest();
  const locations = loadLocations().slice(0, Math.max(1, options.count));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const location of locations) {
    try {
      const crimeStats = await fetchCrimeStats(location, options.month);
      const guardianHeadlines = await fetchGuardianHeadlines(location.name, 5);

      const article = await callEditorialize(baseUrl, {
        location,
        crimeStats,
        guardianHeadlines,
        imageManifest,
        useGemini: options.useGemini,
        options: {
          status: options.status,
          monthYYYYMM: options.month,
        },
      });

      const slug = article.slug || (crimeStats?.canonicalSlug ? `${crimeStats.canonicalSlug}-${crimeStats.monthLabel}` : "");
      if (!slug) {
        throw new Error("Missing slug in editorial response");
      }

      const docRef = db.collection("journalArticles").doc(slug);
      const existing = await docRef.get();
      if (existing.exists && !options.overwrite) {
        skipped += 1;
        console.log(`[skip] ${location.name} (${slug})`);
        continue;
      }

      const normalized = validateAndNormalizeMedia(article);
      const payload = stripEmptyObjectsDeep(
        deepStripUndefined({
          ...normalized,
          status: options.status || normalized.status || "draft",
        })
      ) || {};

      await docRef.set(payload, { merge: true });
      created += 1;
      console.log(`[ok] ${location.name} -> ${slug}`);
    } catch (error) {
      errors += 1;
      console.error(`[error] ${location.name}: ${error.message || error}`);
    }
  }

  console.log(`Done. created=${created} skipped=${skipped} errors=${errors}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
