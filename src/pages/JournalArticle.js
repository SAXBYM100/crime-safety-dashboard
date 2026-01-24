import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchJournalArticleBySlug } from "../services/journalStore";
import { setMeta, setJsonLd, toBrandedUrl } from "../seo";

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString();
}

function buildArticleSchema(article) {
  if (!article) return null;
  const url = toBrandedUrl(`/journal/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.seoTitle || article.headline,
    description: article.seoDescription || article.teaser,
    datePublished: article.publishDate ? new Date(article.publishDate).toISOString() : undefined,
    dateModified: article.generatedAt ? new Date(article.generatedAt).toISOString() : undefined,
    mainEntityOfPage: url,
    author: {
      "@type": "Organization",
      name: "Area IQ",
    },
    publisher: {
      "@type": "Organization",
      name: "Area IQ",
      logo: {
        "@type": "ImageObject",
        url: toBrandedUrl("/brand/area-iq-mark.svg"),
      },
    },
  };
}

export default function JournalArticle() {
  const { slug } = useParams();
  const [status, setStatus] = useState("idle");
  const [article, setArticle] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setStatus("loading");
      const data = await fetchJournalArticleBySlug(slug);
      if (!mounted) return;
      if (!data) {
        setStatus("not-found");
        return;
      }
      setArticle(data);
      setStatus("ready");
    }
    run();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    setMeta(article.seoTitle || article.headline, article.seoDescription || article.teaser, {
      canonicalPath: `/journal/${article.slug}`,
    });
    setJsonLd("journal-article", buildArticleSchema(article));
    return () => setJsonLd("journal-article", null);
  }, [article]);

  if (status === "loading") {
    return (
      <div className="contentWrap pageShell journalArticle">
        <p className="statusLine">Loading intelligence brief...</p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="contentWrap pageShell journalArticle">
        <h1>Brief not found</h1>
        <p>That intelligence brief is not available.</p>
        <Link className="ghostButton" to="/journal">
          Back to journal
        </Link>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="contentWrap pageShell journalArticle">
      <header className="journalArticleHeader">
        <p className="journalKicker">Journal intelligence brief</p>
        <h1>{article.headline}</h1>
        <div className="journalArticleMeta">
          <span>{article.tags?.[0] || article.locationRef || "UK"}</span>
          <span>{article.dataMonth || "Latest"}</span>
          <span>{formatDate(article.publishDate)}</span>
        </div>
      </header>

      <section className="journalSection journalAnswer">
        <h2>Answer summary</h2>
        <p>{article.answerSummary}</p>
      </section>

      <section className="journalSection">
        <h2>Key signals</h2>
        <div className="journalSignals">
          {(article.signals || []).map((signal, idx) => (
            <div key={`${signal.label}-${idx}`} className="journalSignalCard">
              <div className="journalSignalLabel">{signal.label}</div>
              <div className="journalSignalValue">{signal.value}</div>
              <div className="journalSignalMeta">
                <span>{signal.trend || "flat"}</span>
                <span>{signal.source}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="journalAdPlaceholder" aria-hidden="true">
        Sponsored
      </div>

      <section className="journalSection">
        <h2>Definitions</h2>
        <ul className="journalList">
          {(article.definitions || []).map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="journalSection">
        <h2>Insights</h2>
        <div className="journalInsights">
          {(article.insights || []).map((item, idx) => (
            <div key={`${item}-${idx}`} className="journalInsightCard">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="journalSection">
        <h2>Methodology and sources</h2>
        <p>{article.methodology}</p>
        <ul className="journalList">
          {(article.sources || []).map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
        <p className="journalMeta">Generated at {formatDate(article.generatedAt)}</p>
      </section>

      <section className="journalSection journalCta">
        <h2>Open full Area IQ report</h2>
        <p>Continue with the live report to explore incident maps, trends, and categories.</p>
        <div className="journalCtaActions">
          <Link className="primaryButton" to={article.ctaLink || "/app"}>
            Open full report
          </Link>
          <Link className="ghostButton" to="/app">
            Open intelligence console
          </Link>
        </div>
      </section>
    </div>
  );
}
