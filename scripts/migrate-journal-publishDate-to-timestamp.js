/**
 * One-off migration: Convert journalArticles.publishDate (ISO string) -> Firestore Timestamp
 * Optional: converts generatedAt too if it's an ISO string.
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\secrets\serviceAccountKey.json"
 *   $env:DRY_RUN="true"
 *   node scripts/migrate-journal-publishDate-to-timestamp.js
 *
 * Real run:
 *   Remove-Item Env:DRY_RUN -ErrorAction SilentlyContinue
 *   node scripts/migrate-journal-publishDate-to-timestamp.js
 */

const admin = require("firebase-admin");

function isIsoString(v) {
  return typeof v === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
}

function toDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const dryRun = String(process.env.DRY_RUN || "").toLowerCase() === "true";

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();

  console.log("== Journal publishDate migration ==");
  console.log("DRY_RUN:", dryRun);
  console.log("Project:", (await admin.app().options.credential.getAccessToken?.().catch(() => null)) ? "(auth OK)" : "(auth init)");

  const snap = await db.collection("journalArticles").get();

  console.log("Docs scanned:", snap.size);

  let updated = 0;
  const updatedDocs = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const updates = {};

    // publishDate
    if (isIsoString(data.publishDate)) {
      const d = toDate(data.publishDate);
      if (d) updates.publishDate = admin.firestore.Timestamp.fromDate(d);
    }

    // generatedAt (optional)
    if (isIsoString(data.generatedAt)) {
      const d = toDate(data.generatedAt);
      if (d) updates.generatedAt = admin.firestore.Timestamp.fromDate(d);
    }

    if (Object.keys(updates).length > 0) {
      updated++;
      updatedDocs.push({ id: doc.id, slug: data.slug });

      if (!dryRun) {
        await doc.ref.update(updates);
      }
    }
  }

  console.log("Docs needing update:", updated);
  console.log("Updated docs:", updatedDocs.slice(0, 50));
  if (updatedDocs.length > 50) console.log(`...and ${updatedDocs.length - 50} more`);

  console.log(dryRun ? "DRY RUN complete (no writes)." : "Migration complete (writes applied).");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
