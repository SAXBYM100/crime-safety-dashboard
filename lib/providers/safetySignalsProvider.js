const SOURCE = "safety-signals";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreFromLatLon(lat, lon, seed) {
  const base = Math.abs(Math.sin(lat * 0.12 + lon * 0.08 + seed)) * 10;
  return Math.round(clamp(4 + base, 1, 10));
}

async function getAreaReport({ lat, lon, radius, name }) {
  const lighting = scoreFromLatLon(lat, lon, 1.2);
  const transport = scoreFromLatLon(lat, lon, 2.4);
  const community = scoreFromLatLon(lat, lon, 3.1);
  const footTraffic = scoreFromLatLon(lat, lon, 4.7);

  return {
    name: name || "Selected area",
    lat,
    lon,
    radius,
    crimes: [],
    metadata: {
      provider: SOURCE,
      safetySignals: {
        lightingScore: lighting,
        transportScore: transport,
        communityResourcesScore: community,
        footTrafficScore: footTraffic,
      },
      note:
        "Safety signals are illustrative placeholders and do not represent official data.",
    },
    sources: [SOURCE],
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getAreaReport, SOURCE };
