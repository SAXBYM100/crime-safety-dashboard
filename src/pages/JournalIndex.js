import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJournalPage } from "../services/journalStore";
import { setMeta, setJsonLd, toBrandedUrl } from "../seo";

const FALLBACK_IMAGE = "/images/cities/drone.jpg";

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  return new Date(value);
}

function formatDate(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function formatRelative(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function dedupeBySlug(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.slug || item.id;
    if (!key) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }
    const existingDate = toDate(existing.publishDate);
    const nextDate = toDate(item.publishDate);
    if (!existingDate || !nextDate) return;
    if (nextDate.getTime() > existingDate.getTime()) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).sort((a, b) => {
    const aDate = toDate(a.publishDate);
    const bDate = toDate(b.publishDate);
    if (!aDate || !bDate) return 0;
    return bDate.getTime() - aDate.getTime();
  });
}

function buildFeedSchema(items) {
  const itemList = items.map((item, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
      url: toBrandedUrl(`/journal/${item.slug}`),
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: itemList,
  };
}

export default function JournalIndex() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState("idle");
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setMeta(
      "Area IQ Live Feed | UK Safety & Risk Intelligence",
      "Latest UK safety and risk intelligence. Fast headlines with deep-dive briefs for every location.",
      { canonicalPath: "/journal" }
    );
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      setJsonLd("journal-feed", buildFeedSchema(items));
    }
    return () => {
      setJsonLd("journal-feed", null);
    };
  }, [items]);

  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setStatus(items.length ? "loading-more" : "loading");
    try {
      const page = await fetchJournalPage({ cursor, pageSize: 10 });
      setItems((prev) => dedupeBySlug([...prev, ...page.items]));
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setStatus("ready");
    } catch (err) {
      console.error("Journal feed error:", err);
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadMore();
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        });
      },
      { rootMargin: "220px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, cursor, items.length]);

  const renderedItems = useMemo(() => {
    return items.map((item, idx) => {
      const showAd = (idx + 1) % 8 === 0;
      return (
        <React.Fragment key={item.id || item.slug || idx}>
          <article className="journalCard">
            <div className="journalCardHeader">
              <span className="journalChip">{item.tags?.[0] || item.locationRef || "UK"}</span>
              <span className="journalDate">{formatRelative(item.publishDate)}</span>
            </div>
            {item.heroImage?.url && (
              <div className="imgWrap gallery journalCardThumb">
                <img
                  src={item.heroImage.url}
                  alt={item.heroImage.alt || ""}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
              </div>
            )}
            <h2>{item.headline}</h2>
            <p className="journalTeaser">{item.teaser}</p>
            <div className="journalMetaRow">
              <span>{formatDate(item.publishDate)}</span>
              <Link to={`/journal/${item.slug}`} className="ghostButton">
                View intelligence
              </Link>
            </div>
          </article>
          {showAd && (
            <div className="journalAdPlaceholder" aria-hidden="true">
              Sponsored
            </div>
          )}
        </React.Fragment>
      );
    });
  }, [items]);

  return (
    <div className="contentWrap pageShell journalFeed">
      <header className="journalHeader">
        <h1>Area IQ Live Feed</h1>
        <p>Fast-moving safety signals and intelligence briefs built from official UK police data.</p>
      </header>

      {status === "error" && <p className="error">Journal feed is unavailable right now.</p>}
      {status === "loading" && <p className="statusLine">Loading intelligence feed...</p>}
      {status === "ready" && items.length === 0 && (
        <p className="statusLine">No journal articles are published yet.</p>
      )}

      <div className="journalGrid">{renderedItems}</div>

      {hasMore && (
        <div ref={sentinelRef} className="journalLoadMore">
          {status === "loading-more" ? "Loading more..." : ""}
        </div>
      )}
    </div>
  );
}
