const DEFAULT_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    const deltaMs = dateMs - Date.now();
    return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : null;
  }
  return null;
}

export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const retries = Number.isFinite(retryOptions.retries) ? retryOptions.retries : 4;
  const baseDelayMs = Number.isFinite(retryOptions.baseDelayMs) ? retryOptions.baseDelayMs : 800;
  const maxDelayMs = Number.isFinite(retryOptions.maxDelayMs) ? retryOptions.maxDelayMs : 10000;
  const jitterRatio = Number.isFinite(retryOptions.jitter) ? retryOptions.jitter : 0.2;
  const retryStatuses = retryOptions.retryStatuses || DEFAULT_RETRY_STATUSES;
  const onRetry = typeof retryOptions.onRetry === "function" ? retryOptions.onRetry : null;

  let attempt = 0;
  while (true) {
    attempt += 1;
    let res;
    try {
      res = await fetch(url, options);
    } catch (error) {
      if (attempt > retries) throw error;
      const baseDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(baseDelay * jitterRatio * Math.random());
      const delayMs = Math.min(maxDelayMs, baseDelay + jitter);
      if (onRetry) onRetry({ attempt, retries, status: "NETWORK_ERROR", delayMs });
      await sleep(delayMs);
      continue;
    }

    if (res.ok) return res;

    const shouldRetry = retryStatuses.has(res.status);
    if (!shouldRetry) {
      const bodyText = await res.text().catch(() => "");
      const snippet = bodyText ? bodyText.slice(0, 200) : "";
      const error = new Error(`Request failed with status ${res.status}. ${snippet}`.trim());
      error.status = res.status;
      error.bodySnippet = snippet;
      throw error;
    }

    if (attempt > retries) return res;

    let delayMs = baseDelayMs * Math.pow(2, attempt - 1);
    let retryAfterSeconds = null;
    if (res.status === 429) {
      retryAfterSeconds = parseRetryAfterSeconds(res.headers.get("Retry-After"));
      if (Number.isFinite(retryAfterSeconds)) {
        delayMs = retryAfterSeconds * 1000;
      }
    }

    const jitter = Math.floor(delayMs * jitterRatio * Math.random());
    delayMs = Math.min(maxDelayMs, delayMs + jitter);
    if (onRetry) {
      onRetry({ attempt, retries, status: res.status, delayMs, retryAfterSeconds });
    }
    await sleep(delayMs);
  }
}

