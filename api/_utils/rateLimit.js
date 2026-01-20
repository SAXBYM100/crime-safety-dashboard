const buckets = new Map();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, reset: now + windowMs };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }

  entry.count += 1;
  buckets.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  return {
    allowed: entry.count <= limit,
    remaining,
    resetMs: entry.reset - now,
  };
}

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

module.exports = { rateLimit, getClientIp };
