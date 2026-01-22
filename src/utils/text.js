const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function capitalizeToken(token) {
  if (!token) return "";
  const lower = token.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function capitalizeApostrophes(token) {
  const parts = token.split("'");
  if (parts.length === 1) return capitalizeToken(token);
  const [first, ...rest] = parts;
  return [capitalizeToken(first), ...rest.map((part) => part.toLowerCase())].join("'");
}

function capitalizeHyphenated(word) {
  return word
    .split("-")
    .map((part) => capitalizeApostrophes(part))
    .join("-");
}

export function toTitleCase(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && SMALL_WORDS.has(lower)) return lower;
      return capitalizeHyphenated(word);
    })
    .join(" ");
}

export function pickPrimaryName(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.split(",")[0].trim();
}
