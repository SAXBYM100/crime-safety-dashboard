require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function normalizeModelName(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const override = normalizeModelName(process.env.GEMINI_MODEL);
  const cacheName = globalThis.__EDITORIALIZE_MODEL_CACHE__?.name || null;
  const cacheFetchedAt = globalThis.__EDITORIALIZE_MODEL_CACHE__?.fetchedAt || 0;
  const cacheAgeMs = cacheFetchedAt ? Date.now() - cacheFetchedAt : null;

  return sendJson(res, 200, {
    hasFetch: typeof globalThis.fetch === "function",
    nodeVersion: process.version,
    geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
    pickedModel: cacheName,
    modelOverride: override || null,
    cacheAgeMs,
  });
};
