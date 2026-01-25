const BASE = "https://content.guardianapis.com/search";

export async function fetchGuardianContext(location, apiKey, limit = 5) {
  if (!apiKey) throw new Error("Missing GUARDIAN_API_KEY");

  const params = new URLSearchParams({
    q: location,
    "page-size": limit,
    "order-by": "newest",
    "show-fields": "trailText",
    "api-key": apiKey,
    section: "uk-news|society|cities|crime|politics"
  });

  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Guardian API failed: ${res.status}`);
  }

  const data = await res.json();

  return (data.response?.results || []).map(a => ({
    title: a.webTitle,
    url: a.webUrl,
    section: a.sectionName || "UK News",
    publishedAt: a.webPublicationDate
  }));
}
