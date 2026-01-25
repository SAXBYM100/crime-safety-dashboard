// scripts/fetch-images.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import "dotenv/config";

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
  const res = await fetch(url, {
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

  const res = await fetch(url, {
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

  const res = await fetch(url, {
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

// --------------------
// MAIN
// --------------------
async function run() {
  // Usage:
  // node scripts/fetch-images.js "manchester uk skyline" cities/manchester 12 pexels
  const [query, destSubdir, countStr, provider = "pexels"] =
    process.argv.slice(2);

  const count = Number(countStr || 10);

  if (!query || !destSubdir) {
    console.log(`
Usage:
node scripts/fetch-images.js "<query>" <destSubdir> [count] [pexels|unsplash]

Example:
node scripts/fetch-images.js "manchester uk city centre at dusk" cities/manchester 12 pexels
`);
    process.exit(1);
  }

  const destDir = path.join(ROOT, destSubdir);
  ensureDir(destDir);

  const manifest = loadManifest();

  const results =
    provider === "unsplash"
      ? await searchUnsplash(query, Math.max(count * 2, 20))
      : await searchPexels(query, Math.max(count * 2, 20));

  let saved = 0;

  for (const item of results) {
    if (saved >= count) break;
    if (!item.downloadUrl || !item.originalUrl) continue;
    if (alreadyHave(manifest, item.originalUrl)) continue;

    const id = sha1(item.originalUrl);
    const baseName = `${safeName(query)}-${id.slice(0, 8)}`;
    const filePathNoExt = path.join(destDir, baseName);

    try {
      const { finalPath, ext } = await downloadToFile(
        item.downloadUrl,
        filePathNoExt
      );

      const filename = `${baseName}${ext}`;
      const publicUrl = `/image-bank/${destSubdir}/${filename}`.replace(
        /\\/g,
        "/"
      );

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
