const buckets = globalThis.__AREA_IQ_TOKEN_BUCKETS__ || new Map();
globalThis.__AREA_IQ_TOKEN_BUCKETS__ = buckets;

function nowMs() {
  return Date.now();
}

function getBucket(key, capacity, refillPerSec) {
  const existing = buckets.get(key);
  if (existing) return existing;
  const bucket = {
    capacity,
    tokens: capacity,
    refillPerSec,
    updatedAt: nowMs(),
  };
  buckets.set(key, bucket);
  return bucket;
}

function consumeToken(key, { capacity = 10, refillPerSec = 0.2 } = {}) {
  const bucket = getBucket(key, capacity, refillPerSec);
  const now = nowMs();
  const delta = Math.max(0, now - bucket.updatedAt) / 1000;
  const refill = delta * bucket.refillPerSec;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    const deficit = 1 - bucket.tokens;
    const retryAfterSeconds = Math.max(1, Math.ceil(deficit / bucket.refillPerSec));
    return { ok: false, retryAfterSeconds };
  }

  bucket.tokens -= 1;
  return { ok: true, retryAfterSeconds: 0 };
}

module.exports = { consumeToken };

