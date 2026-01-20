const SOURCE = "postcodes-io";

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const error = new Error(`Postcodes.io ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function getAreaReport({ lat, lon, radius, name }) {
  const url = new URL("https://api.postcodes.io/postcodes");
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("limit", "1");

  const json = await fetchJson(url.toString());
  const result = Array.isArray(json?.result) ? json.result[0] : null;

  const areaName =
    result?.admin_district || result?.parish || result?.admin_ward || name || "Selected area";

  return {
    name: areaName,
    lat,
    lon,
    radius,
    crimes: [],
    metadata: {
      provider: SOURCE,
      postcode: result?.postcode || "",
      district: result?.admin_district || "",
      region: result?.region || "",
      country: result?.country || "",
      codes: result?.codes || {},
    },
    sources: [SOURCE],
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getAreaReport, SOURCE };
