require("dotenv").config();


const BASE = "https://content.guardianapis.com/search";

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) {
    return sendJson(res, 200, { headlines: [] });
  }

  const body = await readBody(req);
  const locationName = String(body.locationName || "").trim();
  const limit = Number(body.limit || 5);

  if (!locationName) {
    return sendJson(res, 400, { error: "INVALID_LOCATION" });
  }

  const params = new URLSearchParams({
    q: locationName,
    "page-size": Math.max(1, Math.min(10, limit)),
    "order-by": "newest",
    "show-fields": "trailText",
    "api-key": apiKey,
    section: "uk-news|society|cities|crime|politics",
  });

  try {
    const response = await fetch(`${BASE}?${params.toString()}`);
    if (!response.ok) {
      return sendJson(res, 200, { headlines: [] });
    }
    const data = await response.json();
    const headlines = (data.response?.results || [])
      .map((a) => ({
        title: a.webTitle,
        url: a.webUrl,
        section: a.sectionName || "UK News",
        publishedAt: a.webPublicationDate,
      }))
      .filter((headline) => !headline.title.toLowerCase().includes("opinion"));
    return sendJson(res, 200, { headlines });
  } catch (error) {
    return sendJson(res, 200, { headlines: [] });
  }
};
