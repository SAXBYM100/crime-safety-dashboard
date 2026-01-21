const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 300;
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logDevError(context, error, details = {}) {
  if (!isDev()) return;
  const payload = {
    context,
    message: error?.message || "Unknown error",
    status: error?.status,
    name: error?.name,
    code: error?.code,
    ...details,
  };
  console.error(JSON.stringify(payload));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchWithRetry(url, options = {}, config = {}) {
  const retries = Number.isFinite(config.retries) ? config.retries : DEFAULT_RETRIES;
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : DEFAULT_TIMEOUT_MS;
  const retryDelayMs = Number.isFinite(config.retryDelayMs) ? config.retryDelayMs : DEFAULT_RETRY_DELAY_MS;
  const retryStatuses = config.retryStatuses || RETRY_STATUSES;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (res.ok) return res;
      if (!retryStatuses.has(res.status) || attempt === retries) return res;
    } catch (err) {
      if (attempt === retries) throw err;
      if (err?.name === "AbortError") {
        err.code = "ETIMEDOUT";
      }
    }
    const backoff = retryDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 100);
    await delay(backoff + jitter);
  }
  return fetchWithTimeout(url, options, timeoutMs);
}

async function fetchJsonWithRetry(url, options = {}, config = {}) {
  const res = await fetchWithRetry(url, options, config);
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    const msg = `Request failed (HTTP ${res.status} ${res.statusText}).`;
    const error = new Error(text ? `${msg} Details: ${text.slice(0, 160)}` : msg);
    error.status = res.status;
    error.body = text;
    throw error;
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    const error = new Error("Failed to parse JSON response.");
    error.status = res.status;
    throw error;
  }
}

module.exports = { fetchWithRetry, fetchJsonWithRetry, logDevError };
