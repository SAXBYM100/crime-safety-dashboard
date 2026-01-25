import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const JOURNAL_COLLECTION = "journalArticles";
const DEBUG_JOURNAL = process.env.REACT_APP_DEBUG_JOURNAL === "true";

function logDebug(message, payload) {
  if (!DEBUG_JOURNAL) return;
  if (payload !== undefined) {
    console.info(`[journal] ${message}`, payload);
  } else {
    console.info(`[journal] ${message}`);
  }
}

function summarizeDocs(docs = []) {
  return docs.slice(0, 2).map((doc) => ({
    id: doc.id,
    slug: doc.data()?.slug,
  }));
}

function mapArticle(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    publishDate: data.publishDate?.toDate ? data.publishDate.toDate() : data.publishDate,
    generatedAt: data.generatedAt?.toDate ? data.generatedAt.toDate() : data.generatedAt,
  };
}

export async function fetchJournalPage({ cursor, pageSize = 10 } = {}) {
  logDebug("fetch start", { pageSize, hasCursor: Boolean(cursor) });
  const baseQuery = [
    collection(db, JOURNAL_COLLECTION),
    where("status", "==", "published"),
    orderBy("publishDate", "desc"),
    orderBy("slug", "desc"),
  ];
  const q = cursor
    ? query(...baseQuery, startAfter(cursor), limit(pageSize))
    : query(...baseQuery, limit(pageSize));

  try {
    logDebug("query constraints", ["status == published", "order publishDate desc", "order slug desc"]);
    const snap = await getDocs(q);
    logDebug("query result", { size: snap.size, sample: summarizeDocs(snap.docs) });
    const items = snap.docs.map(mapArticle);
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;
    return { items, cursor: nextCursor, hasMore };
  } catch (err) {
    const code = err?.code || "";
    const message = err?.message || "";
    logDebug("query error", { code, message });
    if (code === "failed-precondition" || message.includes("FAILED_PRECONDITION")) {
      logDebug("retrying without slug order");
      const fallbackQuery = [
        collection(db, JOURNAL_COLLECTION),
        where("status", "==", "published"),
        orderBy("publishDate", "desc"),
      ];
      const fallback = cursor
        ? query(...fallbackQuery, startAfter(cursor), limit(pageSize))
        : query(...fallbackQuery, limit(pageSize));
      const snap = await getDocs(fallback);
      logDebug("fallback result", { size: snap.size, sample: summarizeDocs(snap.docs) });
      const items = snap.docs.map(mapArticle);
      const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
      const hasMore = snap.docs.length === pageSize;
      return { items, cursor: nextCursor, hasMore };
    }
    throw err;
  }
}

export async function fetchJournalArticleBySlug(slug) {
  if (!slug) return null;
  const q = query(
    collection(db, JOURNAL_COLLECTION),
    where("slug", "==", slug),
    where("status", "==", "published"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapArticle(snap.docs[0]);
}

export async function createJournalArticle(payload) {
  const publishDate = payload.publishDate instanceof Date
    ? Timestamp.fromDate(payload.publishDate)
    : payload.publishDate;
  const generatedAt = payload.generatedAt instanceof Date
    ? Timestamp.fromDate(payload.generatedAt)
    : payload.generatedAt;
  const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), {
    ...payload,
    publishDate,
    generatedAt,
  });
  return docRef.id;
}
