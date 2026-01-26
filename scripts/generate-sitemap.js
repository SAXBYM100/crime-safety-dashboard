/* scripts/generate-sitemap.js */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DEFAULT_SITE_URL = "https://area-iq.com";
const ROUTES_JSON_PATH = path.join(__dirname, "..", "src", "seo", "sitemapRoutes.json");

const FALLBACK_ROUTES = [
  "/",
  "/guides",
  "/guides/how-uk-crime-data-works",
  "/guides/staying-safe-at-night",
  "/guides/moving-to-a-new-area",
  "/areas",
  "/areas/london",
  "/areas/manchester",
  "/areas/bristol",
  "/city",
  "/city/london",
  "/city/manchester",
  "/city/bristol",
  "/about",
  "/privacy-policy",
  "/terms",
  "/contact",
];

function getSiteUrl() {
  const fromEnv = process.env.REACT_APP_SITE_URL;
  const siteUrl = (fromEnv || DEFAULT_SITE_URL).trim();
  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
}

function readRoutes() {
  try {
    if (fs.existsSync(ROUTES_JSON_PATH)) {
      const raw = fs.readFileSync(ROUTES_JSON_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {
    console.warn("[sitemap] Could not read routes JSON, falling back:", e.message);
  }
  return FALLBACK_ROUTES;
}

function xmlEscape(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSitemapXml(siteUrl, routes) {
  const now = new Date().toISOString();

  const urlNodes = routes
    .filter(Boolean)
    .map((p) => (p.startsWith("/") ? p : `/${p}`))
    .map((p) => `${siteUrl}${p}`)
    .map((loc) => {
      return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${loc === `${siteUrl}/` ? "1.0" : "0.7"}</priority>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes}\n</urlset>\n`;
}

function main() {
  const siteUrl = getSiteUrl();
  const routes = readRoutes();
  const xml = buildSitemapXml(siteUrl, routes);
  const outPath = path.join(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf8");

  console.log(`[sitemap] Generated ${routes.length} URLs -> ${outPath}`);
  console.log(`[sitemap] Base URL: ${siteUrl}`);
}

main();
