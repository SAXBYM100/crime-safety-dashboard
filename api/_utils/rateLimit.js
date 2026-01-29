// api/_utils/rateLimit.js
const buckets = new Map();

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function normalizeArgs(arg1, arg2, arg3) {
  if (typeof arg1 === "string") {
    return { key: arg1, limit: arg2, windowMs: arg3 };
  }
  return arg1 || {};
}

function rateLimit(arg1, arg2, arg3) {
  const { key, limit = 60, windowMs = 60_000 } = normalizeArgs(arg1, arg2, arg3);
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    const resetMs = Math.max(0, resetAt - now);
    return { ok: true, allowed: true, remaining: limit - 1, resetAt, resetMs };
  }

  if (entry.count >= limit) {
    const resetMs = Math.max(0, entry.resetAt - now);
    return { ok: false, allowed: false, remaining: 0, resetAt: entry.resetAt, resetMs };
  }

  entry.count += 1;
  const resetMs = Math.max(0, entry.resetAt - now);
  return {
    ok: true,
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    resetMs,
  };
}

module.exports = { rateLimit, getClientIp };
