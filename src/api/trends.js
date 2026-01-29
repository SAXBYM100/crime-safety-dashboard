const batchCache = new Map();

export async function fetchLast12MonthsCountsByCategory(lat, lng) {
  const url = `/api/trends?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    return { ok: false, code: "UPSTREAM_ERROR", trend: "unknown", rows: [] };
  }
  const data = await res.json();
  return data;
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
    const res = await fetch("/api/trends-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: normalized }),
    });
    if (!res.ok) {
      return { results: {}, partial: true };
    }
    return res.json();
  })();

  batchCache.set(key, promise);
  return promise;
}
