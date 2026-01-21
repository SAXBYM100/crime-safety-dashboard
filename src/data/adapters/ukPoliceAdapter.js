import { geocodeLocation, fetchCrimesForLocation } from "../../services/existing";
import { fetchLast12MonthsCountsByCategory } from "../../api/trends";

const POLICE_SOURCE = {
  name: "UK Police API",
  url: "https://data.police.uk",
};

const POSTCODE_SOURCE = {
  name: "Postcodes.io",
  url: "https://postcodes.io",
};

const OSM_SOURCE = {
  name: "OpenStreetMap Nominatim",
  url: "https://nominatim.openstreetmap.org",
};

export async function ukPoliceAdapter(baseProfile, options = {}) {
  const { onStatus, dateYYYYMM } = options;
  const { query } = baseProfile;

  onStatus?.("Resolving location...");
  const geo = await geocodeLocation(query.value);

  const sources = [POLICE_SOURCE];
  if (geo?.source === "place" || geo?.source === "lookup") sources.push(OSM_SOURCE);
  if (geo?.source === "manual") sources.push({ name: "Manual coordinates" });
  if (geo?.source === "postcode") sources.push(POSTCODE_SOURCE);

  const safety = {
    latestCrimes: [],
    trend: { rows: [] },
    errors: {},
  };

  onStatus?.("Fetching latest crimes...");
  try {
    const crimesResult = await fetchCrimesForLocation(geo.lat, geo.lng, dateYYYYMM || "");
    if (Array.isArray(crimesResult)) {
      safety.latestCrimes = crimesResult;
    }
  } catch (err) {
    safety.errors.crimes = "Latest crime data is temporarily unavailable.";
  }

  onStatus?.("Analyzing trends...");
  try {
    const trend = await fetchLast12MonthsCountsByCategory(geo.lat, geo.lng);
    safety.trend = trend || { rows: [] };
  } catch (err) {
    safety.errors.trend = "Trend data is temporarily unavailable.";
  }

  return {
    canonicalName: geo.name || baseProfile.canonicalName,
    geo: { lat: geo.lat, lon: geo.lng },
    safety,
    sources,
    updatedAt: new Date().toISOString(),
  };
}
