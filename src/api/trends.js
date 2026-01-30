import { fetchWithRetry } from "../utils/fetchWithRetry";

const batchCache = new Map();

export async function fetchLast12MonthsCountsByCategory(lat, lng) {
  const url = `/api/trends?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  let res;
  try {
    res = await fetchWithRetry(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    return {
      ok: false,
      code: err?.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
      trend: "unknown",
      rows: [],
    };
  }
  const text = await res.text().catch(() => "");
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      code: json?.code || json?.error?.code || "UPSTREAM_ERROR",
      trend: "unknown",
      rows: [],
      retryAfterSeconds: json?.retryAfterSeconds,
    };
  }
  return json || { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] };
}

function normalizePoint(point) {
  return {
    key: String(point?.key || ""),
    lat: Number(point?.lat),
    lon: Number(point?.lon),
  };
}

export async function fetchTrendsBatch(points = []) {
  const normalized = points.map(normalizePoint);
  const key = JSON.stringify(normalized);
  if (batchCache.has(key)) return batchCache.get(key);

  const promise = (async () => {
    let res;
    try {
      res = await fetchWithRetry(
        "/api/trends-batch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: normalized }),
        }
      );
    } catch (err) {
      return {
        results: {},
        partial: true,
        rateLimited: err?.status === 429,
        retryAfterSeconds: undefined,
      };
    }
    const text = await res.text().catch(() => "");
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    if (!res.ok) {
      return {
        results: json?.results || {},
        partial: true,
        rateLimited: res.status === 429,
        retryAfterSeconds: json?.retryAfterSeconds,
      };
    }
    return json || { results: {}, partial: true };
  })();

  batchCache.set(key, promise);
  return promise;
}
