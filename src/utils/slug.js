export function normalizePostcodeParam(param) {
  // Accept GL50-1AA or GL50 1AA; output "GL50 1AA"
  const s = String(param || "")
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
  return s.toUpperCase();
}

export function normalizePlaceParam(param) {
  return String(param || "")
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}
