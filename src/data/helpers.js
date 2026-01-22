export function buildEmptyProfile(query) {
  const now = new Date().toISOString();
  return {
    query,
    canonicalName: query.value,
    displayName: query.value,
    adminArea: "",
    geo: { lat: null, lon: null },
    safety: {
      latestCrimes: [],
      trend: { rows: [] },
      errors: {},
    },
    housing: { status: "pending" },
    transport: { status: "pending" },
    demographics: { status: "pending" },
    sources: [],
    updatedAt: now,
  };
}

export function mergeProfile(base, partial) {
  if (!partial) return base;
  const merged = { ...base, ...partial };
  merged.geo = { ...base.geo, ...(partial.geo || {}) };
  merged.safety = {
    ...base.safety,
    ...(partial.safety || {}),
    errors: { ...base.safety.errors, ...(partial.safety?.errors || {}) },
  };
  merged.housing = { ...base.housing, ...(partial.housing || {}) };
  merged.transport = { ...base.transport, ...(partial.transport || {}) };
  merged.demographics = { ...base.demographics, ...(partial.demographics || {}) };
  merged.sources = [...(base.sources || []), ...(partial.sources || [])];
  if (partial.updatedAt) merged.updatedAt = partial.updatedAt;
  return merged;
}

export function getSourcesSummary(profile) {
  const sources = (profile?.sources || []).map((s) => s.name).filter(Boolean);
  return {
    lastUpdated: profile?.updatedAt || null,
    sourcesText: sources.length ? sources.join(", ") : "Sources pending",
  };
}
