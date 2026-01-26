require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function hasFetch() {
  if (typeof globalThis.fetch === "function") return true;
  try {
    require("node-fetch");
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  let hasMediaValidator = false;
  try {
    const media = require("../lib/mediaValidator");
    hasMediaValidator = typeof media.validateAndNormalizeMedia === "function";
  } catch (error) {
    hasMediaValidator = false;
  }

  return sendJson(res, 200, {
    ok: true,
    hasGemini: Boolean(process.env.GEMINI_API_KEY),
    hasGuardian: Boolean(process.env.GUARDIAN_API_KEY),
    hasMediaValidator,
    hasFetch: hasFetch(),
    nodeVersion: process.version,
  });
};
