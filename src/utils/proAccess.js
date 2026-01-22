export function hasProAccess() {
  try {
    return localStorage.getItem("areaIqPro") === "true";
  } catch (err) {
    return false;
  }
}

export function setProAccess(enabled) {
  try {
    localStorage.setItem("areaIqPro", enabled ? "true" : "false");
  } catch (err) {
    // Ignore storage errors (private mode, etc).
  }
}
