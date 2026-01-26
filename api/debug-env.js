// api/debug-env.js
require("dotenv").config({ path: ".env.local" });
require("dotenv").config(); // fallback to .env

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  return sendJson(res, 200, {
    hasGemini: Boolean(process.env.GEMINI_API_KEY),
    hasGuardian: Boolean(process.env.GUARDIAN_API_KEY),
    runtime: "vercel-function",
    nodeVersion: process.version,
  });
};
