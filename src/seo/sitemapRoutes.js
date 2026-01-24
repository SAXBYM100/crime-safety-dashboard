// src/seo/sitemapRoutes.js
// Future-ready in-app route list (optional). For now, sitemap generation uses JSON.

import cities from "../data/cities.json";

export function getCitySlugs() {
  if (Array.isArray(cities)) {
    return cities.map((c) => c.slug).filter(Boolean);
  }
  if (cities && typeof cities === "object") {
    return Object.keys(cities).filter(Boolean);
  }
  return [];
}
