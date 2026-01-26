// scripts/unpublish-all-journals.js
/* eslint-disable no-console */
const fs = require("fs");
const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Env (server only):
// GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const jsonPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    }
  }
  return null;
}

function initAdmin() {
  if (admin.apps.length) return admin;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

async function main() {
  const app = initAdmin();
  const db = app.firestore();
  const snapshot = await db.collection("journalArticles").where("status", "==", "published").get();
  if (snapshot.empty) {
    console.log("No published journals found.");
    return;
  }

  const writer = db.bulkWriter();
  const updatedAt = admin.firestore.FieldValue.serverTimestamp();
  snapshot.docs.forEach((docSnap) => {
    writer.update(docSnap.ref, { status: "draft", updatedAt });
  });
  await writer.close();
  console.log(`Unpublished ${snapshot.size} journal articles.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
