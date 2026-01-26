export function deepStripUndefined(input) {
  if (Array.isArray(input)) {
    return input
      .map((entry) => deepStripUndefined(entry))
      .filter((entry) => entry !== undefined);
  }

  if (input && typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
      const cleaned = deepStripUndefined(value);
      if (cleaned !== undefined) {
        output[key] = cleaned;
      }
    });
    return output;
  }

  return input;
}

export function stripEmptyObjectsDeep(input) {
  if (Array.isArray(input)) {
    const cleaned = input
      .map((entry) => stripEmptyObjectsDeep(entry))
      .filter((entry) => entry !== undefined);
    return cleaned.length ? cleaned : undefined;
  }

  if (input && typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
      const cleaned = stripEmptyObjectsDeep(value);
      if (cleaned !== undefined) {
        output[key] = cleaned;
      }
    });
    return Object.keys(output).length ? output : undefined;
  }

  return input;
}

export function collectUndefinedPaths(input, basePath = "") {
  const paths = [];

  if (input === undefined) {
    paths.push(basePath || "(root)");
    return paths;
  }

  if (Array.isArray(input)) {
    input.forEach((entry, index) => {
      const nextPath = `${basePath}[${index}]`;
      paths.push(...collectUndefinedPaths(entry, nextPath));
    });
    return paths;
  }

  if (input && typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
    Object.entries(input).forEach(([key, value]) => {
      const nextPath = basePath ? `${basePath}.${key}` : key;
      paths.push(...collectUndefinedPaths(value, nextPath));
    });
  }

  return paths;
}
