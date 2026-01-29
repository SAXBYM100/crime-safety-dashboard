require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function robustReadJson(req) {
  const rawFromBody = (value) => {
    if (Buffer.isBuffer(value)) return value.toString("utf8");
    if (typeof value === "string") return value;
    return "";
  };

  let rawBody = "";
  let body = undefined;

  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    body = req.body;
    return { body };
  }

  if (req?.body) {
    rawBody = rawFromBody(req.body);
  }

  if (!rawBody) {
    rawBody = await new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => resolve(raw));
      req.on("error", () => resolve(raw));
    });
  }

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = undefined;
    }
  } else {
    body = undefined;
  }

  return { body };
}

module.exports = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return sendJson(res, 404, { error: "NOT_FOUND" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const { body } = await robustReadJson(req);

  return sendJson(res, 200, {
    keys: body ? Object.keys(body) : [],
    useGemini: body?.useGemini,
    useGeminiType: typeof body?.useGemini,
    hasLocation: Boolean(body?.location),
    hasCrimeStats: Boolean(body?.crimeStats),
    imageManifestIsArray: Array.isArray(body?.imageManifest),
  });
};
