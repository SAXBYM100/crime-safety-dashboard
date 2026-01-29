require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function redactKey(input) {
  if (!input) return "";
  return String(input).replace(/key=([^&\s]+)/gi, "key=REDACTED");
}

function getFetchFn() {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  return null;
}

function normalizeModelName(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

async function listModels(apiKey) {
  const fetchFn = getFetchFn();
  if (!fetchFn) throw new Error("Fetch unavailable");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchFn(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ListModels failed: ${response.status} ${redactKey(text).slice(0, 200)}`);
  }
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("ListModels returned invalid JSON");
  }
  const models = Array.isArray(data?.models) ? data.models : [];
  return models.filter((model) =>
    Array.isArray(model.supportedGenerationMethods) &&
    model.supportedGenerationMethods.includes("generateContent")
  );
}

function pickBestModel(models) {
  if (!Array.isArray(models) || !models.length) return "";
  const pickBy = (re) => models.find((model) => re.test(model.name));
  const flash25 = pickBy(/gemini-2\.5-.*flash/i);
  if (flash25?.name) return flash25.name;
  const flash = pickBy(/flash/i);
  if (flash?.name) return flash.name;
  const pro = pickBy(/pro/i);
  if (pro?.name) return pro.name;
  return models[0].name || "";
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { error: "missing_env", missing: ["GEMINI_API_KEY"] });
  }

  try {
    const override = normalizeModelName(process.env.GEMINI_MODEL);
    const models = await listModels(apiKey);
    const picked = override || pickBestModel(models);
    return sendJson(res, 200, {
      count: models.length,
      pickedRecommended: picked || null,
      models: models.map((m) => ({
        name: m.name,
        supportedGenerationMethods: m.supportedGenerationMethods || [],
      })),
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "GEMINI_MODELS_FAILED",
      message: redactKey(error?.message || String(error)),
    });
  }
};
