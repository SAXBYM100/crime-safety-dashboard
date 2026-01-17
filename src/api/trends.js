// Last-12-months monthly category counts, cached in localStorage.
// Robust against Police API quirks and browser "Failed to fetch" issues.

const LS_PREFIX = "crime_trend_v1:";

function ym(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function last12Months() {
  const out = [];
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 12; i++) {
    out.push(ym(d));
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out.reverse();
}

function cacheKey(lat, lng) {
  const la = Number(lat).toFixed(5);
  const ln = Number(lng).toFixed(5);
  return `${LS_PREFIX}${la},${ln}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > 12 * 60 * 60 * 1000) return null;
    return parsed.data || null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMonth(lat, lng, yyyymm) {
  const url = `https://data.police.uk/api/crimes-street/all-crime?lat=${encodeURIComponent(
    lat
  )}&lng=${encodeURIComponent(lng)}&date=${encodeURIComponent(yyyymm)}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    // Police API quirk: 404 often means "no data for that month/location"
    if (res.status === 404) return [];

    if (!res.ok) {
      // If rate-limited, treat as empty month rather than breaking the chart
      if (res.status === 429 || res.status === 503) return [];
      throw new Error(`Police API ${res.status}`);
    }

    const json = await res.json().catch(() => []);
    return Array.isArray(json) ? json : [];
  } catch (e) {
    // Browser "Failed to fetch" / CORS / transient network errors:
    // Don't kill the whole trend—treat this month as empty.
    return [];
  }
}

export async function fetchLast12MonthsCountsByCategory(lat, lng) {
  const months = last12Months();
  const key = cacheKey(lat, lng);

  const cached = readCache(key);
  if (cached?.months?.length === 12) return cached;

  const series = [];

  // Sequential + tiny delay to reduce blocked/dropped requests
  for (const m of months) {
    const crimes = await fetchMonth(lat, lng, m);

    const counts = {};
    for (const c of crimes) {
      const cat = c.category || "unknown";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    series.push({ month: m, counts });

    await sleep(120); // small spacing to be kind to the API/browser
  }

  const categorySet = new Set();
  for (const row of series) Object.keys(row.counts).forEach((k) => categorySet.add(k));
  const categories = Array.from(categorySet).sort();

  const data = {
    months,
    categories,
    rows: series.map((r) => {
      const byCategory = {};
      let total = 0;
      for (const cat of categories) {
        const v = r.counts[cat] || 0;
        byCategory[cat] = v;
        total += v;
      }
      return { month: r.month, total, byCategory };
    }),
  };

  writeCache(key, data);
  return data;
}
