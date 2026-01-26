const net = require("net");

const port = Number(process.argv[2] || 3001);

const server = net.createServer();

server.once("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[dev] Port ${port} is already in use. Stop the process or choose another port.`);
    process.exit(1);
  }
  console.error(`[dev] Port check failed: ${err.message}`);
  process.exit(1);
});

server.once("listening", () => {
  server.close(() => {
    process.exit(0);
  });
});

server.listen(port, "127.0.0.1");
