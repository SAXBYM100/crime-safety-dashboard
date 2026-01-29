import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "../_lib/firebaseAdmin";

export default async function handler(req, res) {
  await initAdmin();
  const db = getFirestore();

  const snap = await db
    .collection("journalArticles")
    .where("status", "==", "published")
    .orderBy("publishDate", "desc")
    .limit(5000)
    .get();

  const urls = snap.docs.map((doc) => {
    const slug = doc.data().slug;
    return `
  <url>
    <loc>https://www.area-iq.com/journal/${slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.area-iq.com/sitemaps/static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.area-iq.com/sitemaps/journal.xml</loc>
  </sitemap>
</sitemapindex>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(xml);
}
