const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  const apiPort = process.env.API_PORT || "3002";
  const target = `http://127.0.0.1:${apiPort}`;
  console.log(`[proxy] /api -> ${target}`);

  app.use(
    "/api",
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: false,
      proxyTimeout: 60000,
      timeout: 60000,
      onError: (err, req, res) => {
        if (res.headersSent) return;
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "API_UNREACHABLE", details: err.message }));
      },
    })
  );
};
