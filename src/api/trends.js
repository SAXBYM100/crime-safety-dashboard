export async function fetchLast12MonthsCountsByCategory(lat, lng) {
  const url = `/api/trends?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Trend request failed (${res.status}).`);
  }
  return res.json();
}
