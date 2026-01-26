const fs = require("fs");
const path = require("path");

const API_DIR = path.join(__dirname, "..", "api");
const IMPORT_RE = /^\s*import\s/m;
const EXPORT_DEFAULT_RE = /^\s*export\s+default\s/m;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function main() {
  const files = walk(API_DIR);
  const offenders = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    if (IMPORT_RE.test(content) || EXPORT_DEFAULT_RE.test(content)) {
      offenders.push(file);
    }
  });

  if (offenders.length) {
    console.error("[verify:api] ESM syntax found in /api files:");
    offenders.forEach((file) => console.error(`- ${path.relative(process.cwd(), file)}`));
    process.exit(1);
  }

  console.log(`[verify:api] OK (${files.length} files checked)`);
}

main();
