import { geocodeLocation, fetchCrimesForLocation } from "../../services/existing";
import { fetchLast12MonthsCountsByCategory } from "../../api/trends";
import { DEFAULT_SOURCES } from "../sources";

const POLICE_SOURCE = DEFAULT_SOURCES[0];
const POSTCODE_SOURCE = DEFAULT_SOURCES[1];
const OSM_SOURCE = DEFAULT_SOURCES[2];

export async function ukPoliceAdapter(baseProfile, options = {}) {
  const { onStatus, dateYYYYMM, loading } = options;
  const { query } = baseProfile;
  const requestId = loading?.requestId;
  const trackStart = loading?.trackStart;
  const trackEnd = loading?.trackEnd;

  onStatus?.("Resolving location...");
  if (requestId) trackStart?.(requestId);
  let geo;
  try {
    geo = await geocodeLocation(query.value);
  } finally {
    if (requestId) trackEnd?.(requestId);
  }

  const sources = [POLICE_SOURCE];
  if (geo?.type === "place") sources.push(OSM_SOURCE);
  if (geo?.type === "latlng") sources.push({ name: "Manual coordinates" });
  if (geo?.type === "postcode") sources.push(POSTCODE_SOURCE);

  const safety = {
    latestCrimes: [],
    trend: { rows: [] },
    errors: {},
  };

  onStatus?.("Fetching latest crimes...");
  try {
    if (requestId) trackStart?.(requestId);
    const crimesResult = await fetchCrimesForLocation(geo.lat, geo.lng, dateYYYYMM || "");
    if (Array.isArray(crimesResult)) {
      safety.latestCrimes = crimesResult;
    }
  } catch (err) {
    safety.errors.crimes = "Latest crime data is temporarily unavailable.";
  } finally {
    if (requestId) trackEnd?.(requestId);
  }

  onStatus?.("Analyzing trends...");
  try {
    if (requestId) trackStart?.(requestId);
    const trend = await fetchLast12MonthsCountsByCategory(geo.lat, geo.lng);
    if (trend?.ok === false) {
      safety.errors.trend = "Trend data is temporarily unavailable.";
      safety.trend = { rows: [] };
    } else {
      safety.trend = trend || { rows: [] };
    }
  } catch (err) {
    safety.errors.trend = "Trend data is temporarily unavailable.";
  } finally {
    if (requestId) trackEnd?.(requestId);
  }

  return {
    query: { ...baseProfile.query, kind: geo.type || baseProfile.query.kind, value: geo.inputNormalized || query.value },
    canonicalName: geo.displayName || baseProfile.canonicalName,
    displayName: geo.displayName || baseProfile.displayName,
    adminArea: geo.adminArea || baseProfile.adminArea,
    canonicalSlug: geo.canonicalSlug || baseProfile.canonicalSlug,
    inputNormalized: geo.inputNormalized || query.value,
    requestId: geo.requestId,
    geo: { lat: geo.lat, lon: geo.lng },
    safety,
    sources,
    updatedAt: new Date().toISOString(),
  };
}
