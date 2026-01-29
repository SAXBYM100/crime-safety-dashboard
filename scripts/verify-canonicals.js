const { CANONICAL_BASE, normalizeUrl } = require("./normalize-url");

const samples = [
  "/",
  "/areas",
  "/areas/london",
  "/journal/some-article",
];

const expected = [
  "https://www.area-iq.com/",
  "https://www.area-iq.com/areas",
  "https://www.area-iq.com/areas/london",
  "https://www.area-iq.com/journal/some-article",
];

let failed = 0;

samples.forEach((path, idx) => {
  const actual = normalizeUrl(`${CANONICAL_BASE}${path}`);
  const exp = expected[idx];
  const ok = actual === exp;
  if (!ok) failed += 1;
  console.log(`${ok ? "OK" : "FAIL"} ${path} -> ${actual}`);
});

if (failed > 0) {
  console.error(`\n${failed} canonical checks failed.`);
  process.exit(1);
}

console.log("\nAll canonical checks passed.");

