const CANONICAL_BASE = "https://area-iq.com";

function upsertMeta(name, content) {
  if (content === undefined || content === null) return;
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertProperty(property, content) {
  if (content === undefined || content === null) return;
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function normalizeUrl(urlString, includeQuery = false) {
  try {
    const url = new URL(urlString);
    url.hash = "";
    if (!includeQuery) url.search = "";
    return url.toString();
  } catch {
    return urlString;
  }
}

function buildCanonical({
  canonicalUrl,
  canonicalPath,
  includeQuery = false,
} = {}) {
  if (canonicalUrl) return normalizeUrl(canonicalUrl, includeQuery);

  if (canonicalPath) {
    const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
    return normalizeUrl(`${CANONICAL_BASE}${path}`, includeQuery);
  }

  if (typeof window === "undefined") return "";
  const path = window.location.pathname || "/";
  const search = includeQuery ? window.location.search || "" : "";
  return normalizeUrl(`${CANONICAL_BASE}${path}${search}`, includeQuery);
}

function normalizeOptions(arg1, arg2, arg3) {
  if (arg1 && typeof arg1 === "object") {
    return { ...arg1 };
  }
  return {
    title: arg1,
    description: arg2,
    ...(arg3 && typeof arg3 === "object" ? arg3 : {}),
  };
}

/**
 * setMeta
 *
 * Supported call styles:
 * - setMeta(title, description, options?)
 * - setMeta({ title, description, canonicalPath, ... })
 */
export function setMeta(arg1, arg2, arg3) {
  const options = normalizeOptions(arg1, arg2, arg3);
  const {
    title,
    description,
    canonicalUrl,
    canonicalPath,
    includeQuery = false,
    robots,
    og = {},
    twitter = {},
    canonical,
  } = options;

  if (title) document.title = title;
  upsertMeta("description", description);
  if (robots) upsertMeta("robots", robots);

  const canonicalHref = buildCanonical({
    canonicalUrl: canonicalUrl || canonical,
    canonicalPath,
    includeQuery,
  });
  upsertLink("canonical", canonicalHref);

  const ogTitle = og.title || title;
  const ogDesc = og.description || description;
  const ogType = og.type || "website";
  const ogUrl = og.url || canonicalHref;

  if (ogTitle) upsertProperty("og:title", ogTitle);
  if (ogDesc) upsertProperty("og:description", ogDesc);
  if (ogType) upsertProperty("og:type", ogType);
  if (ogUrl) upsertProperty("og:url", ogUrl);
  if (og.image) upsertProperty("og:image", og.image);

  const twCard = twitter.card || "summary_large_image";
  const twTitle = twitter.title || title;
  const twDesc = twitter.description || description;

  if (twCard) upsertMeta("twitter:card", twCard);
  if (twTitle) upsertMeta("twitter:title", twTitle);
  if (twDesc) upsertMeta("twitter:description", twDesc);
  if (twitter.image) upsertMeta("twitter:image", twitter.image);
}

export function toBrandedUrl(urlOrPath, includeQuery = false) {
  if (!urlOrPath) return `${CANONICAL_BASE}/`;
  if (/^https?:\/\//i.test(urlOrPath)) {
    return normalizeUrl(urlOrPath, includeQuery);
  }
  const path = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return normalizeUrl(`${CANONICAL_BASE}${path}`, includeQuery);
}
