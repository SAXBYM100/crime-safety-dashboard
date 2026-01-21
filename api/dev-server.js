const http = require("http");

const areaReport = require("./area-report");
const trends = require("./trends");
const resolveLocation = require("./resolve-location");

const routes = {
  "/api/area-report": areaReport,
  "/api/trends": trends,
  "/api/resolve-location": resolveLocation,
};

const port = Number(process.env.API_DEV_PORT) || 3001;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const handler = routes[url.pathname];
    if (!handler) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    req.query = Object.fromEntries(url.searchParams.entries());

    const pendingHeaders = new Map();
    const wrapped = {
      statusCode: 200,
      setHeader: (key, value) => {
        pendingHeaders.set(key, value);
        res.setHeader(key, value);
      },
      status(code) {
        res.statusCode = code;
        return this;
      },
      json(payload) {
        pendingHeaders.forEach((value, key) => res.setHeader(key, value));
        sendJson(res, res.statusCode || 200, payload);
      },
    };

    await handler(req, wrapped);
  } catch (err) {
    sendJson(res, 500, {
      error: { code: "DEV_SERVER_ERROR", message: err?.message || "Server error." },
    });
  }
});

server.listen(port, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
