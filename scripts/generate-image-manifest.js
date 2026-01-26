// scripts/generate-image-manifest.js
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const IMAGE_BANK_DIR = path.join(PROJECT_ROOT, "public", "image-bank");
const OUTPUT = path.join(IMAGE_BANK_DIR, "manifest.json");
const LEGACY_MANIFEST = path.join(PROJECT_ROOT, "scripts", "image-manifest.json");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function toWebPath(absPath) {
  // convert ".../public/..." -> "/..."
  const relFromPublic = path.relative(path.join(PROJECT_ROOT, "public"), absPath);
  return "/" + relFromPublic.split(path.sep).join("/");
}

function loadLegacyManifest() {
  if (!fs.existsSync(LEGACY_MANIFEST)) return { items: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(LEGACY_MANIFEST, "utf8"));
    if (Array.isArray(raw)) return { items: raw };
    if (Array.isArray(raw?.items)) return raw;
  } catch (error) {
    console.warn("Failed to parse legacy image-manifest.json", error);
  }
  return { items: [] };
}

function main() {
  if (!fs.existsSync(IMAGE_BANK_DIR)) {
    console.error("Missing folder:", IMAGE_BANK_DIR);
    process.exit(1);
  }

  const legacy = loadLegacyManifest();
  const legacyMap = new Map(
    legacy.items
      .filter((item) => item && typeof item.filePath === "string")
      .map((item) => [item.filePath.trim(), item])
  );

  const files = walk(IMAGE_BANK_DIR)
    .filter((f) => ALLOWED_EXT.has(path.extname(f).toLowerCase()))
    .filter((f) => !f.endsWith(`${path.sep}manifest.json`));

  const manifest = files
    .map((abs) => {
      const filePath = toWebPath(abs);
      const legacyItem = legacyMap.get(filePath) || {};
      return {
        filePath,
        creditLine: legacyItem.creditLine || "",
        originalUrl: legacyItem.originalUrl || "",
        provider: legacyItem.provider || "",
        photographerName: legacyItem.photographerName || "",
        photographerUrl: legacyItem.photographerUrl || "",
      };
    })
    .sort((a, b) => a.filePath.localeCompare(b.filePath));

  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`? Wrote ${manifest.length} entries -> ${OUTPUT}`);
}

main();
