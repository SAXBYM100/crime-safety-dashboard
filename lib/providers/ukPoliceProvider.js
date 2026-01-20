const SOURCE = "uk-police";

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(`UK Police API ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
    error.status = res.status;
    throw error;
  }
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

function toCrimeRecord(item, fallbackLat, fallbackLon, fallbackDate) {
  const lat = Number(item?.location?.latitude || fallbackLat);
  const lon = Number(item?.location?.longitude || fallbackLon);
  return {
    id: `${SOURCE}-${item.id || `${lat}-${lon}-${item.month || fallbackDate}`}`,
    category: item.category || "unknown",
    count: 1,
    date: item.month || fallbackDate || "",
    location: {
      lat: Number.isFinite(lat) ? lat : fallbackLat,
      lon: Number.isFinite(lon) ? lon : fallbackLon,
      name: item?.location?.street?.name || "Unknown",
    },
    source: SOURCE,
    outcome: item?.outcome_status?.category || "",
  };
}

async function getAreaReport({ lat, lon, radius, from, to, name }) {
  const dateParam = to || from || "";
  const url = new URL("https://data.police.uk/api/crimes-street/all-crime");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lon));
  if (dateParam) url.searchParams.set("date", dateParam);

  const raw = await fetchJson(url.toString());
  const crimes = raw.map((item) => toCrimeRecord(item, lat, lon, dateParam));

  return {
    name: name || "Selected area",
    lat,
    lon,
    radius,
    crimes,
    metadata: {
      provider: SOURCE,
      totalRecords: crimes.length,
      month: dateParam || "latest",
    },
    sources: [SOURCE],
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getAreaReport, SOURCE };
