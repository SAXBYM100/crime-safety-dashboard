const ukPoliceProvider = require("./providers/ukPoliceProvider");
const postcodesProvider = require("./providers/postcodesProvider");
const safetySignalsProvider = require("./providers/safetySignalsProvider");
const { logDevError } = require("./serverHttp");

const PROVIDERS = {
  ukpolice: ukPoliceProvider,
  postcodes: postcodesProvider,
  safety: safetySignalsProvider,
};

function parseProviderList(envValue) {
  const raw = envValue || "ukpolice,postcodes,safety";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter((name) => PROVIDERS[name]);
}

function mergeReports(baseInput, reports) {
  const crimes = [];
  const metadata = {};
  const sources = new Set();
  let name = baseInput.name || "Selected area";

  for (const report of reports) {
    if (!report) continue;
    if (report.name && report.name !== "Selected area") name = report.name;
    if (Array.isArray(report.crimes)) crimes.push(...report.crimes);
    if (report.metadata) metadata[report.metadata.provider || "provider"] = report.metadata;
    if (Array.isArray(report.sources)) report.sources.forEach((s) => sources.add(s));
  }

  return {
    name,
    lat: baseInput.lat,
    lon: baseInput.lon,
    radius: baseInput.radius,
    crimes,
    metadata,
    sources: Array.from(sources),
    generatedAt: new Date().toISOString(),
  };
}

async function getAreaReport(input) {
  const providerNames = parseProviderList(process.env.DATA_PROVIDERS);
  const results = [];
  const errors = [];

  for (const name of providerNames) {
    const provider = PROVIDERS[name];
    if (!provider?.getAreaReport) continue;
    try {
      const result = await provider.getAreaReport(input);
      results.push(result);
    } catch (err) {
      logDevError("provider.error", err, { provider: name });
      errors.push({
        provider: name,
        message: err?.message || "Provider failed",
        status: err?.status || 500,
      });
    }
  }

  if (!results.length) {
    const error = new Error("No providers returned data.");
    error.details = errors;
    throw error;
  }

  const report = mergeReports(input, results);
  if (errors.length) {
    report.metadata.providerErrors = errors;
  }
  return report;
}

module.exports = { getAreaReport, parseProviderList };
