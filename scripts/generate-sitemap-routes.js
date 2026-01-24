/* scripts/generate-sitemap-routes.js
 *
 * Builds src/seo/sitemapRoutes.json from:
 *  - src/seo/sitemapBaseRoutes.json (static routes)
 *  - src/data/cities.json (city list)
 */

const fs = require("fs");
const path = require("path");

const BASE_ROUTES_PATH = path.join(__dirname, "..", "src", "seo", "sitemapBaseRoutes.json");
const CITIES_PATH = path.join(__dirname, "..", "src", "data", "cities.json");
const OUT_PATH = path.join(__dirname, "..", "src", "seo", "sitemapRoutes.json");

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function normalizeCities(cities) {
  if (Array.isArray(cities)) return cities;
  if (cities && typeof cities === "object") {
    return Object.keys(cities).map((slug) => ({ slug, ...cities[slug] }));
  }
  return [];
}

function main() {
  const baseRoutes = readJson(BASE_ROUTES_PATH);
  const citiesRaw = readJson(CITIES_PATH);
  const cities = normalizeCities(citiesRaw);

  const cityRoutes = [];

  for (const city of cities) {
    const slug = (city?.slug || "").trim();
    if (!slug) continue;
    cityRoutes.push(`/city/${slug}`);
    cityRoutes.push(`/areas/${slug}`);
  }

  const all = uniq([...(baseRoutes || []), ...cityRoutes]).filter(Boolean);
  all.sort();

  fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2) + "\n", "utf8");
  console.log(`[sitemap-routes] Wrote ${all.length} routes -> ${OUT_PATH}`);
}

main();
