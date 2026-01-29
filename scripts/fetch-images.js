// scripts/fetch-images.js
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");

const PROJECT_ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local") });
dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

const fetchFn = global.fetch || ((...args) => import("node-fetch").then((m) => m.default(...args)));

// --------------------
// ENV
// --------------------
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// --------------------
// PATHS
// --------------------
const ROOT = path.join(process.cwd(), "public", "image-bank");
const MANIFEST_PATH = path.join(process.cwd(), "scripts", "image-manifest.json");
const CITIES_PATH = path.join(PROJECT_ROOT, "src", "data", "cities.json");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// --------------------
// HELPERS
// --------------------
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha1(s) {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { items: [] };
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(manifest) {
  ensureDir(path.dirname(MANIFEST_PATH));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function alreadyHave(manifest, originalUrl) {
  const id = sha1(originalUrl);
  return manifest.items.some((x) => x.id === id);
}

function safeName(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitedError(err) {
  const msg = String(err?.message || "");
  return /429|rate limit/i.test(msg);
}

async function withRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !isRateLimitedError(err)) throw err;
      const jitter = Math.floor(Math.random() * 250);
      const wait = baseDelayMs * 2 ** (attempt - 1) + jitter;
      console.warn(`Rate limited. Retrying in ${wait}ms...`);
      await sleep(wait);
    }
  }
}

function countExistingImages(dir) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.filter((entry) => {
    if (!entry.isFile()) return false;
    return ALLOWED_EXT.has(path.extname(entry.name).toLowerCase());
  }).length;
}

function loadCityMap() {
  if (!fs.existsSync(CITIES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CITIES_PATH, "utf8"));
  } catch (err) {
    console.warn("Failed to parse cities.json", err);
    return {};
  }
}

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, rawValue = "true"] = arg.replace(/^--/, "").split("=");
      args[key] = rawValue;
    } else if (!args._) {
      args._ = [arg];
    } else {
      args._.push(arg);
    }
  });
  return args;
}

// --------------------
// EXTENSION HELPERS
// --------------------
function extFromContentType(contentType) {
  const ct = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (ct === "image/jpeg" || ct === "image/jpg") return ".jpg";
  if (ct === "image/png") return ".png";
  if (ct === "image/webp") return ".webp";
  if (ct === "image/avif") return ".avif";
  return "";
}

function extFromUrl(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\.(jpg|jpeg|png|webp|avif)$/i);
    if (!m) return "";
    const ext = m[0].toLowerCase();
    return ext === ".jpeg" ? ".jpg" : ext;
  } catch {
    return "";
  }
}

// --------------------
// DOWNLOAD
// --------------------
async function downloadToFile(url, filePathWithoutExt) {
  const res = await fetchFn(url, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type");
  const ext = extFromContentType(contentType) || extFromUrl(url) || ".jpg";

  const finalPath = `${filePathWithoutExt}${ext}`;
  const buf = Buffer.from(await res.arrayBuffer());

  fs.writeFileSync(finalPath, buf);

  return { finalPath, ext, contentType };
}

// --------------------
// PROVIDERS
// --------------------
async function searchPexels(query, perPage = 15) {
  if (!PEXELS_API_KEY) throw new Error("Missing PEXELS_API_KEY");

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
    query
  )}&per_page=${perPage}&orientation=landscape`;

  const res = await fetchFn(url, {
    headers: { Authorization: PEXELS_API_KEY },
  });

  if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`);

  const data = await res.json();

  return (data.photos || []).map((p) => ({
    provider: "pexels",
    originalUrl: p.url,
    photographerName: p.photographer,
    photographerUrl: p.photographer_url,
    downloadUrl: p.src?.large2x || p.src?.original,
  }));
}

async function searchUnsplash(query, perPage = 15) {
  if (!UNSPLASH_ACCESS_KEY) throw new Error("Missing UNSPLASH_ACCESS_KEY");

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query
  )}&per_page=${perPage}&orientation=landscape`;

  const res = await fetchFn(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });

  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`);

  const data = await res.json();

  return (data.results || []).map((p) => ({
    provider: "unsplash",
    originalUrl: p.links?.html,
    photographerName: p.user?.name,
    photographerUrl: p.user?.links?.html,
    downloadUrl: p.urls?.regular || p.urls?.full,
  }));
}

async function fetchResults(provider, query, count) {
  const perPage = Math.max(count * 2, 20);
  const search = provider === "unsplash" ? searchUnsplash : searchPexels;
  return withRetry(() => search(query, perPage));
}

async function downloadResults({ query, destSubdir, count, provider, manifest }) {
  const destDir = path.join(ROOT, destSubdir);
  ensureDir(destDir);
  const results = await fetchResults(provider, query, count);

  let saved = 0;

  for (const item of results) {
    if (saved >= count) break;
    if (!item.downloadUrl || !item.originalUrl) continue;
    if (alreadyHave(manifest, item.originalUrl)) continue;

    const id = sha1(item.originalUrl);
    const baseName = `${safeName(query)}-${id.slice(0, 8)}`;
    const filePathNoExt = path.join(destDir, baseName);

    try {
      const { finalPath, ext } = await downloadToFile(item.downloadUrl, filePathNoExt);
      const filename = `${baseName}${ext}`;
      const publicUrl = `/image-bank/${destSubdir}/${filename}`.replace(/\\/g, "/");

      manifest.items.push({
        id,
        provider: item.provider,
        query,
        filePath: publicUrl,
        originalUrl: item.originalUrl,
        photographerName: item.photographerName || "",
        photographerUrl: item.photographerUrl || "",
        importedAt: new Date().toISOString(),
        creditLine:
          item.provider === "pexels"
            ? `Photo by ${item.photographerName} (Pexels)`
            : `Photo by ${item.photographerName} (Unsplash)`,
      });

      saved += 1;
      console.log(`Saved: ${finalPath}`);
    } catch (e) {
      console.warn(`Skip (download failed): ${item.downloadUrl}`, e.message);
    }
  }

  return saved;
}

function buildCityQueries(cityName) {
  const name = cityName || "UK city";
  return [
    `${name} uk skyline`,
    `${name} uk city centre`,
    `${name} uk aerial view`,
    `${name} uk streets`,
  ];
}

async function seedCities({ cities, min = 3, provider = "pexels" }) {
  const manifest = loadManifest();
  const cityMap = loadCityMap();

  for (const slug of cities) {
    const city = cityMap?.[slug];
    const displayName = city?.name || slug;
    const destSubdir = `cities/${slug}`;
    const destDir = path.join(ROOT, destSubdir);
    ensureDir(destDir);

    const existing = countExistingImages(destDir);
    if (existing >= min) {
      console.log(`Skip ${slug}: already has ${existing} images.`);
      continue;
    }

    const needed = Math.max(min - existing, 0);
    console.log(`Seeding ${slug}: need ${needed} images.`);

    let saved = 0;
    const queries = buildCityQueries(displayName);
    for (const query of queries) {
      if (saved >= needed) break;
      try {
        const remaining = needed - saved;
        const got = await downloadResults({
          query,
          destSubdir,
          count: remaining,
          provider,
          manifest,
        });
        saved += got;
      } catch (err) {
        if (isRateLimitedError(err)) {
          console.warn(`Rate limited while seeding ${slug}. Waiting before retry...`);
          await sleep(1000);
        } else {
          console.warn(`Skip query "${query}" for ${slug}:`, err.message);
        }
      }
    }

    saveManifest(manifest);
    console.log(`Done ${slug}: saved ${saved} images.`);
  }
}

// --------------------
// MAIN
// --------------------
async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.cities) {
    const featured = ["london", "manchester", "birmingham", "bristol", "leeds", "liverpool", "sheffield", "glasgow", "cardiff", "edinburgh"];
    const cities = args.cities === "featured" ? featured : args.cities.split(",").map((s) => s.trim()).filter(Boolean);
    const min = Number(args.min || 3);
    const provider = String(args.provider || "pexels").toLowerCase();

    if (provider === "pexels" && !PEXELS_API_KEY) {
      console.error("Missing PEXELS_API_KEY for Pexels downloads.");
      process.exit(1);
    }
    if (provider === "unsplash" && !UNSPLASH_ACCESS_KEY) {
      console.error("Missing UNSPLASH_ACCESS_KEY for Unsplash downloads.");
      process.exit(1);
    }

    if (!cities.length) {
      console.log("No cities provided.");
      process.exit(1);
    }

    await seedCities({ cities, min, provider });
    return;
  }

  // Usage:
  // node scripts/fetch-images.js "manchester uk skyline" cities/manchester 12 pexels
  const [query, destSubdir, countStr, provider = "pexels"] = args._ || [];
  const count = Number(countStr || 10);

  if (!query || !destSubdir) {
    console.log(`
Usage:
node scripts/fetch-images.js "<query>" <destSubdir> [count] [pexels|unsplash]
node scripts/fetch-images.js --cities=featured --min=3 --provider=pexels

Examples:
node scripts/fetch-images.js "manchester uk city centre at dusk" cities/manchester 12 pexels
node scripts/fetch-images.js --cities=glasgow,liverpool,bristol --min=3 --provider=pexels
`);
    process.exit(1);
  }

  const chosenProvider = String(provider || "pexels").toLowerCase();
  if (chosenProvider === "pexels" && !PEXELS_API_KEY) {
    console.error("Missing PEXELS_API_KEY for Pexels downloads.");
    process.exit(1);
  }
  if (chosenProvider === "unsplash" && !UNSPLASH_ACCESS_KEY) {
    console.error("Missing UNSPLASH_ACCESS_KEY for Unsplash downloads.");
    process.exit(1);
  }

  const manifest = loadManifest();
  const saved = await downloadResults({ query, destSubdir, count, provider: chosenProvider, manifest });
  saveManifest(manifest);
  console.log(`Done. Saved ${saved} images to ${destSubdir}`);
}

// --------------------
// RUN
// --------------------
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
