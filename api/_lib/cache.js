const cache = new Map();
const inflight = new Map();

function nowMs() {
  return Date.now();
}

function getCacheEntry(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (nowMs() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function getCache(key) {
  const entry = getCacheEntry(key);
  return entry ? entry.value : null;
}

function setCache(key, value, ttlMs) {
  const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 0;
  cache.set(key, { value, storedAt: nowMs(), expiresAt: nowMs() + ttl });
}

function getOrSetInflight(key, factory) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = Promise.resolve()
    .then(factory)
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

module.exports = { getCache, getCacheEntry, setCache, getOrSetInflight };
