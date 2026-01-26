// scripts/generate-journals.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { generateJournalDrafts } from "../src/services/journalGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(PROJECT_ROOT, ".env.local") });
dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

// Path to your manifest
const MANIFEST_PATH = path.join(process.cwd(), "scripts", "image-manifest.json");

function loadImageManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn("No image-manifest.json found — running without images");
    return { items: [] };
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

async function run() {
  // Locations passed on command line:
  // node scripts/generate-journals.js manchester london birmingham
  const locations = process.argv.slice(2);

  if (locations.length === 0) {
    console.log("Usage:");
    console.log("  node scripts/generate-journals.js <location1> <location2> ...");
    process.exit(1);
  }

  const imageManifest = loadImageManifest();

  const results = await generateJournalDrafts(locations, {
    status: "draft",
    imageManifest,
  });

  console.log("Generation results:");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
