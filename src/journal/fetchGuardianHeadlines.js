export async function fetchGuardianHeadlines(locationName, limit = 5) {
  if (!locationName) return [];
  try {
    const res = await fetch("/api/guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationName, limit }),
    });
    if (!res.ok) {
      console.warn(`Guardian API failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.headlines) ? data.headlines : [];
  } catch (error) {
    console.warn("Guardian API fetch failed.", error);
    return [];
  }
}
