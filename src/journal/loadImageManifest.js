function normalizeManifest(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function tryFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeManifest(data);
}

export async function loadImageManifest() {
  const primary = await tryFetch("/image-bank/manifest.json");
  if (!primary || !primary.length) {
    throw new Error("Image manifest missing or invalid at /image-bank/manifest.json");
  }
  return primary;
}
