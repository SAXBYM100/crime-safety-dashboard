export const CANONICAL_HOST = "www.area-iq.com";
export const CANONICAL_BASE = `https://${CANONICAL_HOST}`;

export function normalizeUrl(input, includeQuery = false) {
  if (!input) return `${CANONICAL_BASE}/`;
  let url;
  try {
    url = new URL(input, CANONICAL_BASE);
  } catch {
    return input;
  }

  url.protocol = "https:";

  url.hostname = CANONICAL_HOST;

  if (!includeQuery) url.search = "";
  url.hash = "";

  let pathname = url.pathname || "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.replace(/\/+$/, "");
  }
  url.pathname = pathname;

  return url.toString();
}

export function normalizePath(pathname = "/") {
  let path = String(pathname || "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.replace(/\/+$/, "");
  }
  return path || "/";
}

