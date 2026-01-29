// Client-side data access helpers that call the serverless /api routes.

async function fetchJsonOrThrow(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text().catch(() => "");
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (err) {
      json = null;
    }
  }
  if (!res.ok) {
    const requestId = json?.requestId;
    const apiCode = json?.error?.code || json?.code;
    const apiMessage =
      (Array.isArray(json?.errors) && json.errors[0]) || json?.error?.message;
    let msg = apiMessage || `Request failed (HTTP ${res.status} ${res.statusText}).`;
    if (res.status === 400) msg += " Your input may be malformed.";
    if (res.status === 429) msg = "Temporary service limit - try again in a moment.";
    if (res.status === 503) msg += " Service busy. Try again soon.";
    if (text && !apiMessage && process.env.NODE_ENV !== "production") {
      msg += ` Details: ${text.slice(0, 160)}`;
    }
    if (requestId) msg += ` (ref ${requestId})`;
    const err = new Error(msg);
    err.requestId = requestId;
    err.code = apiCode || (res.status === 429 ? "RATE_LIMITED" : undefined);
    err.retryAfterSeconds = Number(res.headers.get("Retry-After")) || json?.retryAfterSeconds || undefined;
    throw err;
  }
  return json;
}

export async function geocodeLocation(query) {
  if (typeof query !== "string") {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[geocodeLocation] non-string query", {
        type: typeof query,
        value: query,
      });
    }
    throw new Error("Location query must be a string.");
  }
  const q = query.trim();
  if (!q) throw new Error("Enter a location (postcode, place name, or lat,lng).");

  const url = `/api/resolve-location?q=${encodeURIComponent(q)}`;
  const json = await fetchJsonOrThrow(url);
  if (json?.ambiguous) {
    const suffix = json.requestId ? ` (ref ${json.requestId})` : "";
    const err = new Error((json.message || "Multiple matches found. Please choose the intended place.") + suffix);
    err.code = "AMBIGUOUS";
    err.candidates = Array.isArray(json.candidates) ? json.candidates : [];
    err.requestId = json.requestId;
    if (process.env.NODE_ENV !== "production") {
      console.log("[geocodeLocation] ambiguous", { query: q, candidates: err.candidates });
    }
    throw err;
  }
  if (!json || typeof json.lat !== "number" || typeof json.lng !== "number") {
    const suffix = json?.requestId ? ` (ref ${json.requestId})` : "";
    throw new Error(`Location lookup failed. Try a different query.${suffix}`);
  }
  return {
    lat: json.lat,
    lng: json.lng,
    type: json.type,
    inputNormalized: json.inputNormalized || q,
    displayName: json.displayName || q,
    canonicalSlug: json.canonicalSlug,
    adminArea: json.adminArea,
    confidence: json.confidence,
    sources: json.sources,
    requestId: json.requestId,
  };
}

export async function geocodePostcode(postcode) {
  return geocodeLocation(postcode);
}

export async function geocodePlaceName(placeName) {
  return geocodeLocation(placeName);
}

export async function fetchAreaReport({ lat, lng, radius = 1000, from = "", to = "", name = "" }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    radius: String(radius),
  });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (name) params.set("name", name);

  const url = `/api/area-report?${params.toString()}`;
  return fetchJsonOrThrow(url);
}

export async function fetchAreaReportBatch(items = []) {
  const res = await fetch("/api/area-report-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
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
      code: json?.error?.code || json?.code || "UPSTREAM_ERROR",
      results: json?.results || {},
      retryAfterSeconds: Number(res.headers.get("Retry-After")) || json?.retryAfterSeconds,
    };
  }
  return json || { results: {}, partial: true };
}

export async function fetchCrimesForLocation(lat, lng, dateYYYYMM = "") {
  const report = await fetchAreaReport({
    lat,
    lng,
    radius: 1000,
    from: dateYYYYMM,
    to: dateYYYYMM,
  });
  return Array.isArray(report?.crimes) ? report.crimes : [];
}
