require("dotenv").config();

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasGuardian = Boolean(process.env.GUARDIAN_API_KEY);

  return sendJson(res, 200, {
    ok: true,
    hasGemini,
    hasGuardian,
    nodeVersion: process.version,
    time: new Date().toISOString(),
  });
};
